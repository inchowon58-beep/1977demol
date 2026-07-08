import { DataStorageError, getPages, savePage, type SeoPage } from "./data";
import { buildSeoSlug, ensureUniqueSeoSlug } from "./seo-slug";
import { generateSeoContent } from "./gemini";
import { getSiteConfig } from "./site-config";
import { getImageIndexFromSeed } from "./site-images";
import { resolveLocalPartnersForKeyword } from "./local-business";
import { consumeSeoQuota, getSeoQuotaStatus, getSeoQuotaStatusForTenant } from "./seo-quota";
import { enqueueCollectionRequest } from "./collection-queue";
import { getServicePeriodStatus } from "./service-period";
import { normalizeSeoKeyword, finalizeSeoTitle } from "./seo-keyword";
import { getResolvedSiteConfig, getResolvedSiteConfigForTenant } from "@/utils/siteConfig";
import {
  getTenantPages,
  saveTenantPage,
} from "@/lib/supabase/tenant-pages";

function getNaverCredentials(site: Awaited<ReturnType<typeof getSiteConfig>>) {
  return {
    naverClientId: site.naverClientId || process.env.NAVER_CLIENT_ID || "",
    naverClientSecret: site.naverClientSecret || process.env.NAVER_CLIENT_SECRET || "",
  };
}

export class SeoCreateError extends Error {
  constructor(
    message: string,
    public readonly code: "QUOTA" | "SERVICE" | "DUPLICATE" | "STORAGE" | "GENERATE"
  ) {
    super(message);
    this.name = "SeoCreateError";
  }
}

export async function createSeoPageFromKeyword(
  rawKeyword: string,
  options?: { siteConfigId?: string }
): Promise<{
  page: SeoPage;
  collectionEnqueued: boolean;
  tenantId?: string;
}> {
  const service = await getServicePeriodStatus();
  if (!service.active) {
    throw new SeoCreateError(
      "사용 기간이 만료되었습니다. 마스터 설정에서 기간 연장 후 다시 시도하세요.",
      "SERVICE"
    );
  }

  const trimmedKeyword = normalizeSeoKeyword(rawKeyword.trim());

  const resolved = options?.siteConfigId
    ? await getResolvedSiteConfigForTenant(options.siteConfigId)
    : await getResolvedSiteConfig();

  if (options?.siteConfigId && !resolved) {
    throw new SeoCreateError("테넌트 사이트 설정을 찾을 수 없습니다.", "STORAGE");
  }

  const { tenant, isTenant, config: site } = resolved!;

  const quota =
    isTenant && tenant
      ? await getSeoQuotaStatusForTenant(tenant.id)
      : await getSeoQuotaStatus();

  if (quota.remaining <= 0) {
    const label = quota.subdomain ? ` (${quota.subdomain})` : "";
    throw new SeoCreateError(
      `오늘 SEO 페이지 생성 한도${label}(${quota.limit}개)를 모두 사용했습니다.`,
      "QUOTA"
    );
  }

  const existingPages =
    isTenant && tenant ? await getTenantPages(tenant.id) : await getPages();

  const duplicate = existingPages.find(
    (p) => normalizeSeoKeyword(p.keyword) === trimmedKeyword
  );
  if (duplicate) {
    throw new SeoCreateError(
      `이미 등록된 키워드입니다: ${trimmedKeyword}`,
      "DUPLICATE"
    );
  }

  let generated;
  try {
    generated = await generateSeoContent({
      keyword: trimmedKeyword,
      apiKey: site.geminiApiKey || process.env.GEMINI_API_KEY || "",
      site,
    });
  } catch (error) {
    if (error instanceof DataStorageError) throw error;
    throw new SeoCreateError("AI 콘텐츠 생성에 실패했습니다.", "GENERATE");
  }

  const now = new Date().toISOString();
  const pageId = isTenant && tenant ? crypto.randomUUID() : `page-${Date.now()}`;
  const baseSlug = buildSeoSlug(trimmedKeyword, pageId, generated.slug);
  const slug = await ensureUniqueSeoSlug(
    baseSlug,
    existingPages.map((p) => p.slug)
  );

  const { region, partners } = await resolveLocalPartnersForKeyword(
    trimmedKeyword,
    getNaverCredentials(site)
  );

  const page: SeoPage = {
    id: pageId,
    slug,
    keyword: trimmedKeyword,
    regionName: region || undefined,
    title: finalizeSeoTitle(generated.title, trimmedKeyword),
    description: generated.description,
    content: generated.content,
    faqs: generated.faqs,
    localPartners: partners.length > 0 ? partners : undefined,
    imageIndex: getImageIndexFromSeed(slug, site),
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (isTenant && tenant) {
      await saveTenantPage(tenant.id, page);
    } else {
      await savePage(page);
    }
    await consumeSeoQuota(isTenant && tenant ? tenant.id : undefined);
  } catch (error) {
    if (error instanceof DataStorageError) {
      throw new SeoCreateError(error.message, "STORAGE");
    }
    throw new SeoCreateError(
      error instanceof Error ? error.message : "SEO 페이지 저장 실패",
      "STORAGE"
    );
  }

  const enqueueResult = await enqueueCollectionRequest(pageId, page, {
    siteConfigId: isTenant && tenant ? tenant.id : undefined,
  });
  if (!enqueueResult.ok) {
    console.error("Auto collection enqueue failed:", enqueueResult.message);
  }

  return {
    page,
    collectionEnqueued: enqueueResult.ok,
    tenantId: tenant?.id,
  };
}
