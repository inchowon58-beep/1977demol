import type { SiteConfig } from "./site-config-types";
import { getImageIndexFromSeed, getImageUrl } from "./site-images";

const MIN_IMAGES = 7;
const MAX_IMAGES = 12;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function nextRand(state: number): { value: number; state: number } {
  const next = (state * 1664525 + 1013904223) | 0;
  return { value: Math.abs(next), state: next };
}

/** 페이지당 7~12장 (slug 기준 고정) */
export function getSeoImageCount(seed: string): number {
  const { value } = nextRand(hashSeed(`${seed}:count`));
  return MIN_IMAGES + (value % (MAX_IMAGES - MIN_IMAGES + 1));
}

/** 서로 다른 이미지 인덱스 N개 */
export function getSeoImageIndices(
  seed: string,
  config: SiteConfig,
  count?: number
): number[] {
  const total = count ?? getSeoImageCount(seed);
  const max = Math.max(1, config.imageCount);
  const pool = Array.from({ length: max }, (_, i) => i + 1);

  let state = hashSeed(`${seed}:imgs`);
  for (let i = pool.length - 1; i > 0; i--) {
    const { value, state: s } = nextRand(state);
    state = s;
    const j = value % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const pick = Math.min(total, pool.length);
  if (pick >= pool.length) return pool;

  const base = getImageIndexFromSeed(seed, config);
  const result = pool.slice(0, pick);
  if (!result.includes(base) && pick > 0) {
    result[pick - 1] = base;
  }
  return result;
}

/** 1·2·3장 한 줄 배치로 분할 */
function buildRowSizes(seed: string, total: number): number[] {
  const rows: number[] = [];
  let remaining = total;
  let state = hashSeed(`${seed}:layout`);

  while (remaining > 0) {
    if (remaining <= 3) {
      rows.push(remaining);
      break;
    }

    const { value, state: s } = nextRand(state);
    state = s;
    const size = (value % 3) + 1;
    rows.push(size);
    remaining -= size;
  }

  return rows;
}

function buildSeoImageFigure(url: string, alt: string): string {
  return `<figure class="seo-content-image"><img src="${url}" alt="${alt.replace(/"/g, "&quot;")}" loading="lazy" width="800" height="500" /><figcaption>${alt}</figcaption></figure>`;
}

function buildGalleryRow(urls: string[], keyword: string, startNum: number): string {
  const cols = urls.length;
  const figures = urls
    .map((url, i) =>
      buildSeoImageFigure(url, `${keyword} 시공 사례 ${startNum + i}`)
    )
    .join("");
  return `<div class="seo-image-row seo-image-row--${cols}">${figures}</div>`;
}

function buildGalleryRows(
  urls: string[],
  seed: string,
  keyword: string
): string[] {
  const rowSizes = buildRowSizes(seed, urls.length);
  const rows: string[] = [];
  let offset = 0;
  let figNum = 1;

  for (const size of rowSizes) {
    const slice = urls.slice(offset, offset + size);
    rows.push(buildGalleryRow(slice, keyword, figNum));
    offset += size;
    figNum += size;
  }

  return rows;
}

function distributeRows(rows: string[], slotCount: number): string[] {
  if (slotCount <= 0) return [rows.join("")];
  if (rows.length === 0) return Array(slotCount).fill("");

  const groups: string[][] = Array.from({ length: slotCount }, () => []);
  rows.forEach((row, i) => {
    groups[i % slotCount].push(row);
  });

  return groups.map((g) => g.join(""));
}

const PLACEHOLDER_RE = /\{\{image\d+\}\}/g;
const MARKER_PREFIX = "__SEO_IMG_SLOT_";

function replacePlaceholdersWithMarkers(content: string): {
  text: string;
  slotCount: number;
} {
  let slotCount = 0;
  const text = content.replace(PLACEHOLDER_RE, () => {
    const marker = `${MARKER_PREFIX}${slotCount}__`;
    slotCount++;
    return marker;
  });
  return { text, slotCount };
}

function injectRowsAtMarkers(content: string, slotHtml: string[]): string {
  let result = content;
  slotHtml.forEach((html, i) => {
    result = result.split(`${MARKER_PREFIX}${i}__`).join(html);
  });
  return result.replace(new RegExp(`${MARKER_PREFIX}\\d+__`, "g"), "");
}

function injectRowsAfterHeadings(content: string, rows: string[]): string {
  const parts = content.split(/(<\/h2>)/i);
  let rowIdx = 0;
  let output = "";

  for (const part of parts) {
    output += part;
    if (part.toLowerCase() === "</h2>" && rowIdx < rows.length) {
      output += rows[rowIdx];
      rowIdx++;
    }
  }

  while (rowIdx < rows.length) {
    output += rows[rowIdx];
    rowIdx++;
  }

  if (rowIdx === 0 && rows.length > 0) {
    output += `<div class="seo-image-block">${rows.join("")}</div>`;
  }

  return output;
}

/** 본문에 7~12장 이미지를 1·2·3열 랜덤 배치로 삽입 */
export function enrichSeoContentWithImages(
  content: string,
  keyword: string,
  config: SiteConfig,
  seed: string
): string {
  const count = getSeoImageCount(seed);
  const indices = getSeoImageIndices(seed, config, count);
  const urls = indices.map((idx) => getImageUrl(idx, config));
  const rows = buildGalleryRows(urls, seed, keyword);

  const { text: marked, slotCount } = replacePlaceholdersWithMarkers(content);

  if (slotCount > 0) {
    const slotHtml = distributeRows(rows, slotCount);
    return injectRowsAtMarkers(marked, slotHtml);
  }

  return injectRowsAfterHeadings(marked, rows);
}
