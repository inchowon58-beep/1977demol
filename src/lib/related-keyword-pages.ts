import type { SeoPage } from "@/lib/data";
import { guidePageUrl } from "./constants";
import { extractRegionFromKeyword } from "./region-parse";
import { resolvePagesContext } from "./pages-resolver";
import { getNearbyRegionNames } from "./nearby-regions";
import { normalizeCityKey } from "./sub-region-map";

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let hash = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) | 0;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pageRegion(page: SeoPage): string | null {
  return extractRegionFromKeyword(page.keyword);
}

function isNeighborRegion(a: string | null, b: string | null, seed: string): boolean {
  if (!a || !b) return false;
  if (normalizeCityKey(a) === normalizeCityKey(b)) return true;
  const neighbors = getNearbyRegionNames(a, seed, 12);
  const bKey = normalizeCityKey(b);
  return neighbors.some((n) => normalizeCityKey(n) === bKey);
}

export interface RelatedKeywordPageLink {
  keyword: string;
  href: string;
  slug: string;
}

export async function getRelatedKeywordPageLinks(
  currentSlug: string,
  currentKeyword: string,
  limit = 30
): Promise<RelatedKeywordPageLink[]> {
  const { pages } = await resolvePagesContext();
  const candidates = pages.filter((p) => p.slug !== currentSlug);
  if (candidates.length === 0) return [];

  const currentRegion = extractRegionFromKeyword(currentKeyword);
  const sameCity: SeoPage[] = [];
  const neighbors: SeoPage[] = [];
  const others: SeoPage[] = [];

  for (const page of candidates) {
    const region = pageRegion(page);
    if (currentRegion && normalizeCityKey(region || "") === normalizeCityKey(currentRegion)) {
      sameCity.push(page);
    } else if (isNeighborRegion(currentRegion, region, currentSlug)) {
      neighbors.push(page);
    } else {
      others.push(page);
    }
  }

  const ordered = [
    ...seededShuffle(sameCity, `${currentSlug}:city`),
    ...seededShuffle(neighbors, `${currentSlug}:near`),
    ...seededShuffle(others, `${currentSlug}:all`),
  ];

  const unique: SeoPage[] = [];
  const seen = new Set<string>();
  for (const page of ordered) {
    const key = page.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(page);
    if (unique.length >= limit) break;
  }

  if (unique.length < limit) {
    for (const page of seededShuffle(candidates, `${currentSlug}:fill`)) {
      if (seen.has(page.slug)) continue;
      seen.add(page.slug);
      unique.push(page);
      if (unique.length >= limit) break;
    }
  }

  return unique.map((page) => ({
    keyword: page.keyword,
    href: guidePageUrl(page.slug),
    slug: page.slug,
  }));
}
