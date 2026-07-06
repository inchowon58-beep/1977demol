/** 텍스트에서 키워드 목록 추출 — 줄바꿈 또는 쉼표(,) 구분 */
export function parseKeywordList(input: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of input.split(/\r?\n/)) {
    for (const part of line.split(/[,，]/)) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
}

export const MAX_BULK_KEYWORDS = 50;
