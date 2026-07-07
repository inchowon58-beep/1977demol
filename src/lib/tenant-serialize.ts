import { todayKst } from "@/lib/supabase/tenant-quota";
import type {
  TenantSiteConfigRow,
  TenantSiteDetail,
  TenantSiteSummary,
} from "@/types/tenant";

export function tenantSiteUrl(subdomain: string): string {
  const proto = subdomain.includes("localhost") ? "http" : "https";
  return `${proto}://${subdomain}`;
}

export function toTenantSiteSummary(row: TenantSiteConfigRow): TenantSiteSummary {
  const content = row.content_data || {};
  return {
    id: row.id,
    siteName: row.site_name,
    subdomain: row.subdomain,
    siteUrl: tenantSiteUrl(row.subdomain),
    createdAt: row.created_at,
    hasSlackWebhook: !!row.slack_webhook?.trim(),
    hasNaverVerification: !!row.naver_verification?.trim(),
    dailySeoLimit: row.daily_seo_limit,
    designVariant: content.designVariant || null,
  };
}

export function toTenantSiteDetail(row: TenantSiteConfigRow): TenantSiteDetail {
  const content = row.content_data || {};
  const today = todayKst();
  const used =
    row.seo_quota_date === today ? Math.max(0, row.seo_quota_count ?? 0) : 0;

  return {
    ...toTenantSiteSummary(row),
    keywords: content.keywords || "",
    bodyContent: content.body || "",
    tagline: content.tagline || "",
    description: content.description || "",
    naverVerification: row.naver_verification || "",
    seoQuotaUsedToday: used,
  };
}
