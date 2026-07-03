import type { MetadataRoute } from "next";
import { getPages } from "@/lib/data";
import { guidePageUrl } from "@/lib/constants";
import { getSiteConfig, getPageImageUrl, resolveSeoPage } from "@/lib/site-config";
import { escapeXml, stripHtml, toCdata, toRfc822 } from "@/lib/site-url";

export interface FeedEntry {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl?: string;
  updatedAt: string;
}

function normalizeEntry(
  entry: Partial<FeedEntry> & { id: string; url: string }
): FeedEntry | null {
  const title = stripHtml(entry.title) || "";
  const rawContent = entry.content || entry.description || "";
  const plain = stripHtml(rawContent) || "";
  const url = entry.url?.startsWith("http") ? entry.url : "";

  if (!url || !title) return null;

  return {
    id: entry.id,
    title,
    description: plain.slice(0, 300),
    content: rawContent || `<p>${escapeXml(plain)}</p>`,
    url,
    imageUrl: entry.imageUrl,
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
}

/** Blob·로컬 data/pages.json 기준 — 생성되는 모든 SEO 페이지 반영 */
export async function getFeedEntries(baseUrl: string): Promise<FeedEntry[]> {
  const [pages, config] = await Promise.all([getPages(), getSiteConfig()]);

  return pages
    .map((page) => {
      const resolved = resolveSeoPage(page, config);
      return normalizeEntry({
        id: page.id,
        title: resolved.title,
        description: resolved.description,
        content: resolved.content,
        url: `${baseUrl}${guidePageUrl(page.slug)}`,
        imageUrl: getPageImageUrl(page, config),
        updatedAt: page.updatedAt || page.createdAt,
      });
    })
    .filter((entry): entry is FeedEntry => entry !== null)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function getSitemapEntries(
  baseUrl: string
): Promise<MetadataRoute.Sitemap> {
  const feedEntries = await getFeedEntries(baseUrl);
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...feedEntries.map((entry) => ({
      url: entry.url,
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

export async function buildRssXml(
  entries: FeedEntry[],
  baseUrl: string,
  feedPath = "/feed.xml"
): Promise<string> {
  const config = await getSiteConfig();
  const feedUrl = `${baseUrl}${feedPath}`;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const buildDate = toRfc822(new Date());
  const ogImage = `${baseUrl}/opengraph-image`;

  const items = entries
    .map((entry) => {
      const enclosure = entry.imageUrl
        ? `\n      <enclosure url="${escapeXml(entry.imageUrl)}" type="image/webp" />`
        : "";
      return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(entry.url)}</link>
      <guid isPermaLink="true">${escapeXml(entry.url)}</guid>
      <description>${escapeXml(entry.description)}</description>
      <content:encoded>${toCdata(entry.content)}</content:encoded>
      <pubDate>${toRfc822(entry.updatedAt)}</pubDate>${enclosure}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.brandName)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(config.description)}</description>
    <language>ko</language>
    <copyright>Copyright ${new Date().getFullYear()} ${escapeXml(config.companyName)}</copyright>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <generator>${escapeXml(config.brandName)}</generator>
    <ttl>60</ttl>
    <image>
      <url>${escapeXml(ogImage)}</url>
      <title>${escapeXml(config.brandName)}</title>
      <link>${escapeXml(baseUrl)}</link>
    </image>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <atom:link href="${escapeXml(sitemapUrl)}" rel="sitemap" type="application/xml" />
${items}
  </channel>
</rss>`;
}
