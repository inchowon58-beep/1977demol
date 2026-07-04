import { extractRegionFromKeyword } from "./region-parse";

function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function dedupeRegionInCompact(text: string, region: string): string {
  let result = text;
  while (result.includes(region + region)) {
    result = result.replaceAll(region + region, region);
  }
  return result;
}

function insertSpacesForKeyword(compact: string, region: string): string {
  if (!compact.startsWith(region)) return compact;

  const rest = compact.slice(region.length);
  const breakWords = ["견적", "지원금", "원상복구", "폐업", "상가", "비용", "무료", "방문"];
  let tail = rest;
  const parts: string[] = [region];

  for (const word of breakWords) {
    const idx = tail.indexOf(word);
    if (idx > 0) {
      parts.push(tail.slice(0, idx), word);
      tail = tail.slice(idx + word.length);
    } else if (idx === 0) {
      parts.push(word);
      tail = tail.slice(word.length);
    }
  }

  if (tail) parts.push(tail);
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/** "자양동 자양동철거" → "자양동철거" 등 지역 중복 제거 */
export function dedupeRegionInText(text: string, region: string | null): string {
  if (!text?.trim()) return "";
  if (!region) return text.trim().replace(/\s+/g, " ");

  const esc = escapeRegExp(region);
  let result = text.trim().replace(/\s+/g, " ");

  result = result.replace(new RegExp(`^${esc}\\s+${esc}(?=[가-힣])`, "gi"), region);
  result = result.replace(new RegExp(`(${esc})\\s+\\1`, "gi"), "$1");

  const compact = result.replace(/\s/g, "");
  const dedupedCompact = dedupeRegionInCompact(compact, region);
  if (dedupedCompact !== compact) {
    result = insertSpacesForKeyword(dedupedCompact, region);
  }

  return result.replace(/\s+/g, " ").trim();
}

/** 입력 키워드 정규화 — 지역·띄어쓰기 중복 정리 */
export function normalizeSeoKeyword(keyword: string): string {
  const spaced = keyword.trim().replace(/\s+/g, " ");
  const compact = spaced.replace(/\s/g, "");
  const region =
    extractRegionFromKeyword(compact) || extractRegionFromKeyword(spaced);

  if (!region) return spaced;

  const fixedCompact = dedupeRegionInCompact(compact, region);
  return insertSpacesForKeyword(fixedCompact, region);
}

export function extractRegionForKeyword(keyword: string): string | null {
  const normalized = normalizeSeoKeyword(keyword);
  return extractRegionFromKeyword(normalized.replace(/\s/g, ""));
}

/** 지역명을 제외한 서비스 문구 (제목·본문 조합용) */
export function extractServicePhrase(keyword: string, region: string | null): string {
  const normalized = normalizeSeoKeyword(keyword);
  if (!region) return normalized;

  const esc = escapeRegExp(region);
  const withoutRegion = normalized
    .replace(new RegExp(`^${esc}\\s*`, "i"), "")
    .trim();

  if (withoutRegion) return withoutRegion;
  return normalized;
}

/** 제목·설명용 핵심 키워드 (지역 1회) */
export function buildSeoCorePhrase(keyword: string): string {
  const normalized = normalizeSeoKeyword(keyword);
  const region = extractRegionForKeyword(keyword);
  return dedupeRegionInText(normalized, region);
}

export function polishSeoText(text: string, region: string | null): string {
  return dedupeRegionInText(text, region);
}

export function polishSeoHtmlContent(html: string, keyword: string): string {
  const region = extractRegionForKeyword(keyword);
  return dedupeRegionInText(html, region);
}

/** 제목에서 상호명 제거 (메타 template에서 1회만 붙임) */
export function stripBrandFromTitle(title: string, brandName: string): string {
  if (!title || !brandName) return title.trim();

  let result = title.trim();
  const esc = escapeRegExp(brandName);

  const suffixPatterns = [
    new RegExp(`\\s*\\|\\s*${esc}\\s*$`, "i"),
    new RegExp(`\\s*-\\s*${esc}\\s*$`, "i"),
    new RegExp(`\\s*·\\s*${esc}\\s*$`, "i"),
  ];
  for (const pattern of suffixPatterns) {
    result = result.replace(pattern, "");
  }

  result = result.replace(
    new RegExp(`(${esc})(\\s*[|·-]\\s*\\1)+`, "gi"),
    "$1"
  );

  return result.trim();
}

export function dedupeBrandInTitle(title: string, brandName: string): string {
  return stripBrandFromTitle(title, brandName);
}

/** 제목에 지역 1회 포함 */
export function ensureRegionInTitle(
  title: string,
  keyword: string,
  region: string | null
): string {
  if (!region) return title;

  const deduped = dedupeRegionInText(title, region);
  if (deduped.includes(region)) return deduped;

  const phrase = extractServicePhrase(keyword, region);
  return `${region} ${phrase}`.trim();
}

/** 페이지 표시용 SEO 제목 (지역 1회, 상호 없음) */
export function buildSeoPageTitle(
  titleAfterTokens: string,
  keyword: string,
  brandName?: string
): string {
  const normalizedKeyword = normalizeSeoKeyword(keyword);
  const region = extractRegionForKeyword(normalizedKeyword);

  let title = titleAfterTokens.trim();
  if (brandName) {
    title = stripBrandFromTitle(title, brandName);
  }
  title = dedupeRegionInText(title, region);
  title = ensureRegionInTitle(title, normalizedKeyword, region);
  if (brandName) {
    title = stripBrandFromTitle(title, brandName);
  }

  return title.slice(0, 55);
}

/** 브라우저 탭용 — 상호 1회만 */
export function buildSeoBrowserTitle(pageTitle: string, brandName: string): string {
  const base = stripBrandFromTitle(pageTitle, brandName);
  return `${base} | ${brandName}`;
}

const TITLE_TEMPLATES: ((phrase: string, region: string | null) => string)[] = [
  (phrase, region) => `${region ? `${region} ` : ""}${phrase}`.trim(),
  (phrase, region) => `${region ? `${region} ` : ""}${phrase} 무료 현장 견적`.trim(),
  (phrase, region) =>
    `${region ? `${region} ` : ""}${phrase} — 폐업지원금·철거 원스톱`.trim(),
  (phrase, region) => `${region ? `${region} ` : ""}${phrase} 전문 시공`.trim(),
  (phrase, region) =>
    `${region ? `${region} ` : ""}폐업철거 ${phrase}`.trim(),
  (phrase, region) => `${region ? `${region} ` : ""}${phrase} 비용·일정 상담`.trim(),
  (phrase, region) => `${region ? `${region} ` : ""}${phrase} 맞춤 견적`.trim(),
  (phrase, region) => `${region ? `${region} ` : ""}${phrase} · 철거·원상복구`.trim(),
  (phrase, region) => `${region ? `${region} ` : ""}${phrase} 현장 안내`.trim(),
  (phrase, region) => `${region ? `${region} ` : ""}${phrase} 지원금·견적`.trim(),
];

export function finalizeSeoTitle(title: string, keyword: string): string {
  const normalizedKeyword = normalizeSeoKeyword(keyword);
  const region = extractRegionForKeyword(normalizedKeyword);
  let result = title
    .trim()
    .replace(/\{\{brandName\}\}/gi, "")
    .replace(/\{\{companyName\}\}/gi, "")
    .replace(/\s*[|·-]\s*$/g, "")
    .trim();
  result = dedupeRegionInText(result, region);
  result = ensureRegionInTitle(result, normalizedKeyword, region);
  return result.slice(0, 55);
}

export function generateVariedSeoTitle(
  keyword: string,
  region: string | null,
  aiTitle?: string
): string {
  const resolvedRegion = region || extractRegionForKeyword(keyword);
  const phrase = extractServicePhrase(keyword, resolvedRegion);
  const idx = hashText(`${keyword}-${phrase}-title`) % TITLE_TEMPLATES.length;
  const templateTitle = TITLE_TEMPLATES[idx](phrase, resolvedRegion);

  if (!aiTitle?.trim()) {
    return finalizeSeoTitle(templateTitle, keyword);
  }

  const polishedAi = polishSeoText(aiTitle.trim(), resolvedRegion);
  const compactAi = polishedAi.replace(/\s/g, "");
  const aiLooksDuplicate =
    !!resolvedRegion &&
    (new RegExp(
      `${escapeRegExp(resolvedRegion)}\\s+${escapeRegExp(resolvedRegion)}`,
      "i"
    ).test(polishedAi) ||
      compactAi.includes(resolvedRegion + resolvedRegion));

  const aiTooGeneric =
    polishedAi.includes("견적 저렴한") ||
    polishedAi.includes("견적 지원금") ||
    (polishedAi.match(/\|/g)?.length ?? 0) > 0;

  const aiMissingRegion = !!resolvedRegion && !polishedAi.includes(resolvedRegion);

  if (aiLooksDuplicate || aiTooGeneric || aiMissingRegion || polishedAi.length > 55) {
    return finalizeSeoTitle(templateTitle, keyword);
  }

  return finalizeSeoTitle(polishedAi, keyword);
}
