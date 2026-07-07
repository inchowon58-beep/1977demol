/** Supabase site_configs.theme_color */
export interface TenantThemeColor {
  primary: string;
  secondary: string;
  dark: string;
  darkLight?: string;
  cream?: string;
}

/** Supabase site_configs.content_data */
export interface TenantContentData {
  tagline?: string;
  description?: string;
  keywords?: string;
  body?: string;
  supportBase?: string;
  supportExtra?: string;
  supportMax?: string;
  exposureMode?: "cpa" | "company";
  /** classic | modern | bold */
  designVariant?: "classic" | "modern" | "bold";
  /** 생성 시 고정 난수 시드 — 레이아웃·이미지 재현용 */
  layoutSeed?: number;
  headerStyle?: "sticky" | "overlay" | "minimal" | "hidden";
  footerStyle?: "full" | "compact" | "minimal";
  homeLeadBlocks?: ("hero" | "companyStrip")[];
  sectionOrder?: string[];
  hiddenSections?: string[];
  heroBadge?: string;
  heroIntro?: string;
  heroClosing?: string;
  heroLead?: string;
  heroImageIndex?: number;
  supportImageIndex?: number;
  aboutText?: string;
  supportBlurb?: string;
  whyUsTitle?: string;
  whyUsItems?: { num: string; title: string; highlight: string; sub: string }[];
  processSteps?: { step: string; title: string; desc: string }[];
  reviews?: { name: string; business: string; text: string; rating: number }[];
  reviewsSatisfaction?: string;
  stats?: { label: string; value: string; suffix: string }[];
  casesCount?: number;
  casesItems?: { id: string; title: string; type: string; imageIndex: number }[];
}

export interface TenantSiteConfigRow {
  id: string;
  site_name: string;
  subdomain: string;
  theme_color: TenantThemeColor;
  content_data: TenantContentData;
  naver_verification: string | null;
  slack_webhook: string | null;
  daily_seo_limit: number | null;
  seo_quota_date: string | null;
  seo_quota_count: number;
  created_at: string;
}

export interface CreateSiteInput {
  siteName: string;
  subdomain: string;
  keywords?: string;
  bodyContent?: string;
  slackWebhook?: string;
  naverVerification?: string;
  /** 미입력 시 마스터 전역 dailySeoLimit 복사 */
  dailySeoLimit?: number | string;
}

export interface CreateSiteResult {
  success: boolean;
  siteId?: string;
  subdomain?: string;
  siteUrl?: string;
  themeColor?: TenantThemeColor;
  message?: string;
  error?: string;
  vercelDomain?: { name: string; verified?: boolean };
}

export interface TenantSiteSummary {
  id: string;
  siteName: string;
  subdomain: string;
  siteUrl: string;
  createdAt: string;
  hasSlackWebhook: boolean;
  hasNaverVerification: boolean;
  dailySeoLimit: number | null;
  designVariant: string | null;
}

export interface TenantSiteDetail extends TenantSiteSummary {
  keywords: string;
  bodyContent: string;
  tagline: string;
  description: string;
  naverVerification: string;
  seoQuotaUsedToday: number;
}

export interface UpdateTenantSiteInput {
  siteName?: string;
  keywords?: string;
  bodyContent?: string;
  tagline?: string;
  description?: string;
  slackWebhook?: string;
  naverVerification?: string;
  dailySeoLimit?: number | string | null;
}
