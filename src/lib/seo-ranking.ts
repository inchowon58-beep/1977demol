import { getPages, getRankings, saveRankings, type PageRankingRecord, type RankingsData } from "./data";
import { findNaverWebRank } from "./naver-web-search";
import { getSiteConfig } from "./site-config";

const HISTORY_DAYS = 7;
const RETAIN_DAYS = 14;

function getNaverCredentials(site: Awaited<ReturnType<typeof getSiteConfig>>) {
  return {
    clientId: site.naverClientId || process.env.NAVER_CLIENT_ID || "",
    clientSecret: site.naverClientSecret || process.env.NAVER_CLIENT_SECRET || "",
  };
}

function trimChecks(checks: PageRankingRecord["checks"]): PageRankingRecord["checks"] {
  const cutoff = Date.now() - RETAIN_DAYS * 86400000;
  return checks
    .filter((c) => new Date(c.at).getTime() >= cutoff)
    .sort((a, b) => a.at.localeCompare(b.at));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RankingSummary {
  pageId: string;
  keyword: string;
  slug: string;
  rank: number | null;
  previousRank: number | null;
  change: number | null;
  checkedAt: string | null;
}

export interface RankingHistoryPoint {
  at: string;
  rank: number | null;
  label: string;
}

export function formatRankLabel(rank: number | null): string {
  if (rank === null) return "100위 밖";
  return `${rank}위`;
}

export function buildRankingSummary(record: PageRankingRecord | undefined): RankingSummary | null {
  if (!record) return null;

  const checks = trimChecks(record.checks);
  if (checks.length === 0) {
    return {
      pageId: record.pageId,
      keyword: record.keyword,
      slug: record.slug,
      rank: null,
      previousRank: null,
      change: null,
      checkedAt: null,
    };
  }
  const latest = checks[checks.length - 1];
  const previous = checks.length > 1 ? checks[checks.length - 2] : null;

  let change: number | null = null;
  if (latest && previous && latest.rank !== null && previous.rank !== null) {
    change = previous.rank - latest.rank;
  }

  return {
    pageId: record.pageId,
    keyword: record.keyword,
    slug: record.slug,
    rank: latest?.rank ?? null,
    previousRank: previous?.rank ?? null,
    change,
    checkedAt: latest?.at ?? null,
  };
}

export function getWeekHistory(record: PageRankingRecord | undefined): RankingHistoryPoint[] {
  if (!record) return [];

  const cutoff = Date.now() - HISTORY_DAYS * 86400000;
  return trimChecks(record.checks)
    .filter((c) => new Date(c.at).getTime() >= cutoff)
    .map((c) => {
      const d = new Date(c.at);
      const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return { at: c.at, rank: c.rank, label };
    });
}

export async function getAllRankingSummaries(): Promise<{
  summaries: RankingSummary[];
  lastUpdated: string | null;
  hasNaverApi: boolean;
}> {
  const [pages, rankings, config] = await Promise.all([
    getPages(),
    getRankings(),
    getSiteConfig(),
  ]);
  const { clientId, clientSecret } = getNaverCredentials(config);
  const recordMap = new Map(rankings.records.map((r) => [r.pageId, r]));

  const summaries: RankingSummary[] = pages.map((page) => {
    const record = recordMap.get(page.id);
    return (
      buildRankingSummary(record) ?? {
        pageId: page.id,
        keyword: page.keyword,
        slug: page.slug,
        rank: null,
        previousRank: null,
        change: null,
        checkedAt: null,
      }
    );
  });

  return {
    summaries,
    lastUpdated: rankings.updatedAt || null,
    hasNaverApi: !!(clientId && clientSecret),
  };
}

export async function getPageRankingDetail(pageId: string): Promise<{
  pageId: string;
  keyword: string;
  slug: string;
  summary: RankingSummary | null;
  history: RankingHistoryPoint[];
} | null> {
  const [pages, rankings] = await Promise.all([getPages(), getRankings()]);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return null;

  const record = rankings.records.find((r) => r.pageId === pageId);
  return {
    pageId: page.id,
    keyword: page.keyword,
    slug: page.slug,
    summary: buildRankingSummary(record),
    history: getWeekHistory(record),
  };
}

export async function runAllRankingChecks(): Promise<{
  checked: number;
  skipped: number;
  errors: string[];
}> {
  const [pages, config, rankings] = await Promise.all([
    getPages(),
    getSiteConfig(),
    getRankings(),
  ]);

  const { clientId, clientSecret } = getNaverCredentials(config);
  if (!clientId || !clientSecret) {
    return { checked: 0, skipped: pages.length, errors: ["Naver 검색 API가 설정되지 않았습니다."] };
  }

  const siteUrl = config.url || process.env.SITE_URL || "";
  if (!siteUrl) {
    return { checked: 0, skipped: pages.length, errors: ["SITE_URL이 설정되지 않았습니다."] };
  }

  const now = new Date().toISOString();
  const recordMap = new Map<string, PageRankingRecord>(
    rankings.records.map((r) => [r.pageId, { ...r, checks: [...r.checks] }])
  );
  const errors: string[] = [];
  let checked = 0;

  for (const page of pages) {
    try {
      await delay(350);
      const rank = await findNaverWebRank(
        page.keyword,
        page.slug,
        siteUrl,
        clientId,
        clientSecret
      );

      let record = recordMap.get(page.id);
      if (!record) {
        record = { pageId: page.id, keyword: page.keyword, slug: page.slug, checks: [] };
        recordMap.set(page.id, record);
      }

      record.keyword = page.keyword;
      record.slug = page.slug;
      record.checks.push({ at: now, rank });
      record.checks = trimChecks(record.checks);
      checked++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "순위 확인 실패";
      errors.push(`${page.keyword}: ${msg}`);
    }
  }

  const activeIds = new Set(pages.map((p) => p.id));
  const records = Array.from(recordMap.values()).filter((r) => activeIds.has(r.pageId));

  const data: RankingsData = {
    updatedAt: now,
    records,
  };
  await saveRankings(data);

  return { checked, skipped: pages.length - checked, errors };
}

export async function removeRankingForPage(pageId: string): Promise<void> {
  const rankings = await getRankings();
  const records = rankings.records.filter((r) => r.pageId !== pageId);
  if (records.length === rankings.records.length) return;
  await saveRankings({ ...rankings, records });
}
