/** 키워드에서 지역명 추출 (예: 의정부철거업체 → 의정부) */
export const SERVICE_SUFFIXES = [
  "인테리어철거업체",
  "인테리어철거",
  "상가철거업체",
  "상가철거",
  "폐업철거업체",
  "폐업철거",
  "철거업체",
  "철거",
  "원상복구",
  "폐업",
  "업체",
];

const KNOWN_REGIONS = [
  "의정부", "강남", "서초", "송파", "마포", "영등포", "용산", "종로", "중구", "동대문",
  "성북", "강북", "노원", "도봉", "은평", "서대문", "강서", "양천", "구로", "금천",
  "관악", "동작", "광진", "성동", "강동", "일산", "파주", "김포", "고양", "부천",
  "인천", "수원", "용인", "성남", "안양", "안산", "화성", "평택", "시흥", "광명",
  "부산", "대구", "광주", "대전", "울산", "세종", "창원", "천안", "청주", "전주",
  "제주", "춘천", "원주", "포항", "구미", "김해", "진주", "순천", "목포", "여수",
  "자양동", "성수동", "군자동", "면목동", "삼성동", "잠실", "송파동", "문정동",
  "가락동", "천호동", "구의동", "광나루", "화양동", "능동", "자곡동", "세곡동",
  "삼전동", "역삼동", "논현동", "신사동", "압구정", "대치동", "개포동",
  "상봉리", "하남", "미사", "강일동", "중랑", "망우동", "신내동",
];

export { KNOWN_REGIONS };

export function extractRegionFromKeyword(keyword: string): string | null {
  const normalized = keyword.replace(/\s+/g, "").trim();
  if (!normalized) return null;

  for (const region of KNOWN_REGIONS.sort((a, b) => b.length - a.length)) {
    if (normalized.includes(region)) return region;
  }

  let text = normalized;
  const sorted = [...SERVICE_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    if (text.endsWith(suffix)) {
      text = text.slice(0, -suffix.length);
      break;
    }
  }

  text = text.trim();
  if (text.length < 2 || text.length > 8) return null;
  return text;
}
