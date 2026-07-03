import type { Metadata } from "next";
import type { SiteConfig } from "./site-config-types";
import { NAVER_SITE_VERIFICATION } from "./constants";
import { getSiteUrl } from "./site-url";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export function getOgImageAbsoluteUrl(
  config: SiteConfig,
  ogPath: string
): string {
  const base = getSiteUrl(config).replace(/\/$/, "");
  const path = ogPath.startsWith("/") ? ogPath : `/${ogPath}`;
  return `${base}${path}`;
}

export function buildOgImageMeta(
  config: SiteConfig,
  ogPath: string,
  alt: string
) {
  const url = getOgImageAbsoluteUrl(config, ogPath);
  return [
    {
      url,
      secureUrl: url,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt,
      type: "image/png" as const,
    },
  ];
}

interface PageMetadataOptions {
  title: string;
  description: string;
  path?: string;
  ogPath?: string;
  type?: "website" | "article";
  keywords?: string[];
  noIndex?: boolean;
}

export function buildPageMetadata(
  config: SiteConfig,
  options: PageMetadataOptions
): Metadata {
  const {
    title,
    description,
    path = "/",
    ogPath,
    type = "website",
    keywords,
    noIndex = false,
  } = options;

  const url = path.startsWith("http") ? path : `${getSiteUrl(config)}${path}`;
  const images = ogPath
    ? buildOgImageMeta(config, ogPath, title)
    : buildOgImageMeta(config, "/opengraph-image", title);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: config.brandName,
      locale: "ko_KR",
      type,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((img) => img.url),
    },
    other: {
      "og:image:width": String(OG_IMAGE_WIDTH),
      "og:image:height": String(OG_IMAGE_HEIGHT),
    },
  };
}

export function buildSiteMetadata(config: SiteConfig): Metadata {
  const images = buildOgImageMeta(config, "/opengraph-image", config.brandName);
  const baseUrl = getSiteUrl(config);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: `${config.brandName} | 폐업철거 전문`,
      template: `%s | ${config.brandName}`,
    },
    description: config.description,
    keywords: [
      config.brandName,
      "폐업철거",
      "상가철거",
      "원상복구",
      "폐업지원금",
      "철거견적",
      "무료방문견적",
      "인테리어철거",
    ],
    alternates: {
      canonical: baseUrl,
      types: {
        "application/rss+xml": [
          { url: "/feed.xml", title: `${config.brandName} RSS` },
          { url: "/rss.xml", title: `${config.brandName} RSS` },
        ],
      },
    },
    robots: { index: true, follow: true },
    verification: {
      other: {
        "naver-site-verification": NAVER_SITE_VERIFICATION,
      },
    },
    icons: {
      icon: [{ url: "/icon", type: "image/png" }],
      apple: [{ url: "/apple-icon", type: "image/png" }],
    },
    openGraph: {
      title: config.brandName,
      description: config.description,
      url: baseUrl,
      siteName: config.brandName,
      locale: "ko_KR",
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: config.brandName,
      description: config.description,
      images: images.map((img) => img.url),
    },
    other: {
      "og:image:width": String(OG_IMAGE_WIDTH),
      "og:image:height": String(OG_IMAGE_HEIGHT),
    },
  };
}
