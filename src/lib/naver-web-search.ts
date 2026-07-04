export interface NaverWebItem {
  title: string;
  link: string;
  description: string;
}

interface NaverWebResponse {
  items?: NaverWebItem[];
  total?: number;
  errorMessage?: string;
}

export async function searchNaverWeb(
  query: string,
  clientId: string,
  clientSecret: string,
  options?: { display?: number; start?: number }
): Promise<NaverWebItem[]> {
  const display = Math.min(100, Math.max(1, options?.display ?? 100));
  const start = Math.max(1, options?.start ?? 1);

  const url = `https://openapi.naver.com/v1/search/webkr.json?${new URLSearchParams({
    query,
    display: String(display),
    start: String(start),
    sort: "sim",
  })}`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Naver 웹문서 검색 실패 (${res.status})`);
  }

  const data = (await res.json()) as NaverWebResponse;
  if (data.errorMessage) {
    throw new Error(data.errorMessage);
  }

  return data.items || [];
}

function normalizeHost(host: string): string {
  return host.replace(/^www\./i, "").toLowerCase();
}

/** 검색 결과에서 우리 SEO 페이지 순위 (1~100, 없으면 null) */
export function findPageRankInResults(
  items: NaverWebItem[],
  siteUrl: string,
  slug: string,
  startIndex = 1
): number | null {
  let siteHost = "";
  try {
    siteHost = normalizeHost(new URL(siteUrl).hostname);
  } catch {
    return null;
  }

  const slugPath = `/guide/${slug}`.toLowerCase();

  for (let i = 0; i < items.length; i++) {
    const link = items[i].link || "";
    try {
      const u = new URL(link);
      if (normalizeHost(u.hostname) !== siteHost) continue;
      const path = u.pathname.toLowerCase();
      if (path.includes(slugPath) || path.endsWith(`/${slug.toLowerCase()}`)) {
        return startIndex + i;
      }
    } catch {
      if (link.toLowerCase().includes(slugPath)) {
        return startIndex + i;
      }
    }
  }

  return null;
}

export async function findNaverWebRank(
  keyword: string,
  slug: string,
  siteUrl: string,
  clientId: string,
  clientSecret: string
): Promise<number | null> {
  const items = await searchNaverWeb(keyword.trim(), clientId, clientSecret, {
    display: 100,
    start: 1,
  });
  return findPageRankInResults(items, siteUrl, slug, 1);
}
