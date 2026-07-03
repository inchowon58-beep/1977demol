import { getSettings, type SeoFaq, type SeoPage } from "./data";
import {
  DEFAULT_SITE_CONFIG,
  phoneToTel,
  toPublicConfig,
  type PublicSiteConfig,
  type SiteConfig,
} from "./site-config-types";
import { getImageIndexFromSeed, getImageUrl } from "./site-images";
import { enrichSeoContentWithImages } from "./seo-content-images";

export type { SiteConfig, PublicSiteConfig };
export { DEFAULT_SITE_CONFIG, phoneToTel, toPublicConfig };

/** 과거 저장 콘텐츠 치환용 (설정 변경 시 자동 반영) */
const LEGACY_BRANDS = ["123철거", "1977철거"];
const LEGACY_PHONES = ["1555-7321", "15557321"];
const LEGACY_COMPANIES = ["주식회사베룸", "주식회사 베룸"];

export async function getSiteConfig(): Promise<SiteConfig> {
  const stored = await getSettings();
  return { ...DEFAULT_SITE_CONFIG, ...stored };
}

export function getPageImageUrl(page: SeoPage, config: SiteConfig): string {
  if (page.imageIndex) {
    return getImageUrl(page.imageIndex, config);
  }
  if (page.imageUrl?.startsWith("http")) {
    const match = page.imageUrl.match(/\/(\d+)\.webp$/);
    if (match) return getImageUrl(parseInt(match[1], 10), config);
  }
  return getImageUrl(getImageIndexFromSeed(page.slug || page.keyword, config), config);
}

const TOKEN_KEYS: (keyof SiteConfig)[] = [
  "brandName",
  "companyName",
  "tagline",
  "description",
  "phone",
  "email",
  "address",
  "businessNumber",
  "representative",
  "supportBase",
  "supportExtra",
  "supportMax",
  "url",
];

export function applySiteTokens(text: string, config: SiteConfig): string {
  if (!text) return text;

  let result = text;
  for (const key of TOKEN_KEYS) {
    const token = `{{${key}}}`;
    result = result.split(token).join(String(config[key]));
  }

  for (const legacy of LEGACY_BRANDS) {
    if (legacy !== config.brandName) {
      result = result.split(legacy).join(config.brandName);
    }
  }
  for (const legacy of LEGACY_PHONES) {
    if (legacy !== config.phone && legacy !== phoneToTel(config.phone)) {
      result = result.split(legacy).join(config.phone);
    }
  }
  for (const legacy of LEGACY_COMPANIES) {
    if (legacy !== config.companyName) {
      result = result.split(legacy).join(config.companyName);
    }
  }

  return result;
}

export interface ResolvedSeoPage extends Omit<SeoPage, "imageUrl" | "imageIndex"> {
  imageUrl: string;
  title: string;
  description: string;
  content: string;
  faqs: SeoFaq[];
}

export function resolveSeoPage(page: SeoPage, config: SiteConfig): ResolvedSeoPage {
  const seed = page.slug || page.keyword;
  const tokenized = applySiteTokens(page.content, config);
  return {
    ...page,
    title: applySiteTokens(page.title, config),
    description: applySiteTokens(page.description, config),
    content: enrichSeoContentWithImages(tokenized, page.keyword, config, seed),
    faqs: (page.faqs || []).map((f) => ({
      question: applySiteTokens(f.question, config),
      answer: applySiteTokens(f.answer, config),
    })),
    imageUrl: getPageImageUrl(page, config),
  };
}
