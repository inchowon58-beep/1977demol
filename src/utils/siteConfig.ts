import { headers } from "next/headers";
import { getLegacySiteConfig, type SiteConfig } from "@/lib/site-config";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config-types";
import { resolveExposureMode } from "@/lib/exposure-mode";
import {
  fetchTenantByHostname,
  fetchTenantById,
  isSupabaseConfigured,
  normalizeHostname,
} from "@/lib/supabase/tenant-db";
import type { TenantSiteConfigRow, TenantThemeColor, TenantContentData } from "@/types/tenant";
import { resolveTenantContentData } from "@/lib/tenant-content";

export interface ResolvedSiteContext {
  /** UI·기능에 쓰는 최종 SiteConfig (테넌트 병합 또는 레거시) */
  config: SiteConfig;
  /** Supabase 테넌트 행 — 없으면 null (레거시 단일 사이트) */
  tenant: TenantSiteConfigRow | null;
  /** 테넌트 UI·레이아웃 (레거시는 null) */
  tenantUi: TenantContentData | null;
  theme: TenantThemeColor | null;
  isTenant: boolean;
  hostname: string;
}

function legacyEnvFallback(): Partial<SiteConfig> {
  return {
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || undefined,
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || undefined,
    tagline: process.env.NEXT_PUBLIC_TAGLINE?.trim() || undefined,
    description: process.env.NEXT_PUBLIC_DESCRIPTION?.trim() || undefined,
    url:
      process.env.SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      undefined,
    phone: process.env.NEXT_PUBLIC_PHONE?.trim() || undefined,
    email: process.env.NEXT_PUBLIC_EMAIL?.trim() || undefined,
  };
}

function mergeTenantIntoConfig(
  tenant: TenantSiteConfigRow,
  legacy: SiteConfig
): SiteConfig {
  const content = tenant.content_data || {};
  const proto = tenant.subdomain.includes("localhost") ? "http" : "https";

  return {
    ...legacy,
    brandName: tenant.site_name || legacy.brandName,
    url: `${proto}://${tenant.subdomain}`,
    tagline: content.tagline || tenant.site_name || legacy.tagline,
    description: content.description || content.aboutText || content.body?.slice(0, 160) || legacy.description,
    supportBase: content.supportBase || legacy.supportBase,
    supportExtra: content.supportExtra || legacy.supportExtra,
    supportMax: content.supportMax || legacy.supportMax,
    exposureMode: resolveExposureMode(content.exposureMode ?? legacy.exposureMode),
  };
}

/**
 * hostname 기반 Supabase 테넌트 조회 → 없으면 기존 settings.json + env 폴백.
 * 기존 단일 사이트는 이 함수를 쓰지 않아도 동작하며, 도입 시에도 하위 호환됩니다.
 */
export async function getResolvedSiteConfig(
  hostnameOverride?: string
): Promise<ResolvedSiteContext> {
  let hostname = hostnameOverride || "";

  if (!hostname) {
    try {
      const h = await headers();
      hostname =
        normalizeHostname(h.get("x-forwarded-host")) ||
        normalizeHostname(h.get("host"));
    } catch {
      hostname = "";
    }
  } else {
    hostname = normalizeHostname(hostname);
  }

  const legacy = await getLegacySiteConfig();
  const envOverlay = legacyEnvFallback();
  const baseConfig: SiteConfig = {
    ...DEFAULT_SITE_CONFIG,
    ...legacy,
    ...Object.fromEntries(
      Object.entries(envOverlay).filter(([, v]) => v !== undefined && v !== "")
    ),
  } as SiteConfig;

  if (!isSupabaseConfigured() || !hostname) {
    return {
      config: baseConfig,
      tenant: null,
      tenantUi: null,
      theme: null,
      isTenant: false,
      hostname,
    };
  }

  try {
    const tenant = await fetchTenantByHostname(hostname);
    if (!tenant) {
      return {
        config: baseConfig,
        tenant: null,
        tenantUi: null,
        theme: null,
        isTenant: false,
        hostname,
      };
    }

    const tenantUi = resolveTenantContentData(
      tenant.content_data,
      tenant.subdomain,
      tenant.site_name,
      tenant.content_data?.keywords,
      tenant.content_data?.body,
      baseConfig.imageCount
    );

    return {
      config: mergeTenantIntoConfig({ ...tenant, content_data: tenantUi }, baseConfig),
      tenant: { ...tenant, content_data: tenantUi },
      tenantUi,
      theme: tenant.theme_color,
      isTenant: true,
      hostname,
    };
  } catch {
    return {
      config: baseConfig,
      tenant: null,
      tenantUi: null,
      theme: null,
      isTenant: false,
      hostname,
    };
  }
}

/** VM·대기열 처리용 — site_config_id로 테넌트 컨텍스트 조회 */
export async function getResolvedSiteConfigForTenant(
  siteConfigId: string
): Promise<ResolvedSiteContext | null> {
  if (!isSupabaseConfigured() || !siteConfigId) return null;

  const tenant = await fetchTenantById(siteConfigId);
  if (!tenant) return null;

  const legacy = await getLegacySiteConfig();
  const envOverlay = legacyEnvFallback();
  const baseConfig: SiteConfig = {
    ...DEFAULT_SITE_CONFIG,
    ...legacy,
    ...Object.fromEntries(
      Object.entries(envOverlay).filter(([, v]) => v !== undefined && v !== "")
    ),
  } as SiteConfig;

  const tenantUi = resolveTenantContentData(
    tenant.content_data,
    tenant.subdomain,
    tenant.site_name,
    tenant.content_data?.keywords,
    tenant.content_data?.body,
    baseConfig.imageCount
  );

  return {
    config: mergeTenantIntoConfig({ ...tenant, content_data: tenantUi }, baseConfig),
    tenant: { ...tenant, content_data: tenantUi },
    tenantUi,
    theme: tenant.theme_color,
    isTenant: true,
    hostname: normalizeHostname(tenant.subdomain),
  };
}

/** 클라이언트 컴포넌트용 — CSS 변수 객체 */
export function getTenantCssVariables(
  theme: TenantThemeColor | null
): Record<string, string> | null {
  if (!theme?.primary) return null;
  return {
    "--orange": theme.primary,
    "--orange-light": theme.secondary,
    "--dark": theme.dark,
    "--dark-light": theme.darkLight || theme.dark,
    "--cream": theme.cream || "#fafafa",
  };
}
