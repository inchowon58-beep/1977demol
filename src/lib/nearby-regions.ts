import { KNOWN_REGIONS, extractRegionFromKeyword } from "./region-parse";
import { getPages } from "./data";
import { guidePageUrl } from "./constants";
import type { SiteConfig } from "./site-config-types";

/** 인접·근방 지역 (수도권·광역시 중심) */
const NEARBY_MAP: Record<string, string[]> = {
  의정부: ["양주", "동두천", "포천", "구리", "남양주"],
  양주: ["의정부", "동두천", "포천", "구리", "남양주"],
  구리: ["남양주", "하남", "의정부", "양주", "서울"],
  남양주: ["구리", "하남", "양주", "의정부", "광주"],
  강남: ["서초", "송파", "강동", "용산", "성동"],
  서초: ["강남", "송파", "동작", "관악", "용산"],
  송파: ["강남", "서초", "강동", "하남", "성동"],
  마포: ["용산", "서대문", "은평", "종로", "강서"],
  영등포: ["강서", "양천", "구로", "동작", "용산"],
  인천: ["부천", "김포", "시흥", "안산", "서울"],
  부천: ["인천", "서울", "광명", "시흥", "김포"],
  수원: ["용인", "화성", "오산", "안양", "성남"],
  성남: ["수원", "용인", "광주", "하남", "서울"],
  용인: ["수원", "성남", "화성", "광주", "이천"],
  일산: ["파주", "고양", "김포", "의정부", "서울"],
  고양: ["일산", "파주", "김포", "은평", "서울"],
  파주: ["일산", "고양", "김포", "의정부", "양주"],
  김포: ["고양", "파주", "인천", "부천", "일산"],
  부산: ["김해", "양산", "창원", "거제", "울산"],
  창원: ["김해", "마산", "진주", "거제", "양산"],
  김해: ["부산", "창원", "양산", "거제", "밀양"],
  대구: ["구미", "경산", "포항", "안동", "김천"],
  광주: ["나주", "목포", "순천", "담양", "화순"],
  대전: ["천안", "공주", "논산", "세종", "청주"],
  천안: ["아산", "공주", "대전", "서산", "논산"],
  청주: ["충주", "제천", "천안", "대전", "음성"],
  전주: ["익산", "군산", "완주", "김제", "정읍"],
  제주: ["서귀포", "애월", "한림", "성산", "표선"],
  춘천: ["원주", "홍천", "가평", "양평", "강릉"],
  원주: ["춘천", "횡성", "영월", "제천", "이천"],
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededPick<T>(items: T[], seed: string, count: number): T[] {
  const arr = [...items];
  let hash = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) | 0;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function getNearbyRegionNames(region: string | null, seed: string, count = 5): string[] {
  if (!region) {
    return seededPick(
      KNOWN_REGIONS.filter((r) => r.length >= 2),
      seed,
      count
    );
  }

  const mapped = NEARBY_MAP[region];
  if (mapped && mapped.length >= count) {
    return mapped.slice(0, count);
  }

  const pool = KNOWN_REGIONS.filter((r) => r !== region);
  const fromMap = mapped || [];
  const extra = seededPick(
    pool.filter((r) => !fromMap.includes(r)),
    seed,
    Math.max(0, count - fromMap.length)
  );
  return [...fromMap, ...extra].slice(0, count);
}

export interface NearbyRegionLink {
  region: string;
  href: string | null;
}

export async function getNearbyRegionLinks(
  currentRegion: string | null,
  currentSlug: string,
  _config: SiteConfig
): Promise<NearbyRegionLink[]> {
  const names = getNearbyRegionNames(currentRegion, currentSlug, 5);
  const pages = await getPages();

  return names.map((region) => {
    const match = pages.find((p) => {
      if (p.slug === currentSlug) return false;
      const pageRegion = extractRegionFromKeyword(p.keyword);
      return pageRegion === region || p.keyword.includes(region);
    });
    return {
      region,
      href: match ? guidePageUrl(match.slug) : null,
    };
  });
}
