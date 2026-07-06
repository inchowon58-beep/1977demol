import { DataStorageError, getPages, savePage, type SeoPage } from "./data";
import { buildSeoSlug, ensureUniqueSeoSlug } from "./seo-slug";
import { generateSeoContent } from "./gemini";
import { getSiteConfig } from "./site-config";
import { getImageIndexFromSeed } from "./site-images";
import { resolveLocalPartnersForKeyword } from "./local-business";
import { consumeSeoQuota, getSeoQuotaStatus } from "./seo-quota";
import { enqueueCollectionRequest } from "./collection-queue";
import { getServicePeriodStatus } from "./service-period";
import { normalizeSeoKeyword, finalizeSeoTitle } from "./seo-keyword";

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

export async function createSeoPageFromKeyword(rawKeyword: string): Promise<{
  page: SeoPage;
  collectionEnqueued: boolean;
}> {
  const service = await getServicePeriodStatus();
  if (!service.active) {
    throw new SeoCreateError(
      "사용 기간이 만료되었습니다. 마스터 설정에서 기간 연장 후 다시 시도하세요.",
      "SERVICE"
    );
  }

  const quota = await getSeoQuotaStatus();
  if (quota.remaining <= 0) {
    throw new SeoCreateError(
      `오늘 SEO 페이지 생성 한도(${quota.limit}개)를 모두 사용했습니다.`,
      "QUOTA"
    );
  }

  const trimmedKeyword = normalizeSeoKeyword(rawKeyword.trim());
  const existingPages = await getPages();
  const duplicate = existingPages.find(
    (p) => normalizeSeoKeyword(p.keyword) === trimmedKeyword
  );
  if (duplicate) {
    throw new SeoCreateError(
      `이미 등록된 키워드입니다: ${trimmedKeyword}`,
      "DUPLICATE"
    );
  }

  const site = await getSiteConfig();
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
  const pageId = `page-${Date.now()}`;
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
    await savePage(page);
    await consumeSeoQuota();
  } catch (error) {
    if (error instanceof DataStorageError) {
      throw new SeoCreateError(error.message, "STORAGE");
    }
    throw error;
  }

  const enqueueResult = await enqueueCollectionRequest(pageId, page);
  if (!enqueueResult.ok) {
    console.error("Auto collection enqueue failed:", enqueueResult.message);
  }

  return {
    page,
    collectionEnqueued: enqueueResult.ok,
  };
}
