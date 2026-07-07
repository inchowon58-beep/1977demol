import type { TenantContentData } from "@/types/tenant";

export type DesignVariant = "classic" | "modern" | "bold";
export type HeaderStyle = "sticky" | "overlay" | "minimal" | "hidden";
export type HomeSectionId =
  | "stats"
  | "support"
  | "cases"
  | "whyUs"
  | "process"
  | "reviews"
  | "inquiry"
  | "partner"
  | "cta";

export interface TenantStatItem {
  label: string;
  value: string;
  suffix: string;
}

export interface TenantCaseItem {
  id: string;
  title: string;
  type: string;
  imageIndex: number;
}

export interface TenantWhyUsItem {
  num: string;
  title: string;
  highlight: string;
  sub: string;
}

export interface TenantProcessItem {
  step: string;
  title: string;
  desc: string;
}

export interface TenantReviewItem {
  name: string;
  business: string;
  text: string;
  rating: number;
}

export const DEFAULT_HOME_SECTION_ORDER: HomeSectionId[] = [
  "stats",
  "support",
  "cases",
  "whyUs",
  "process",
  "reviews",
  "inquiry",
  "partner",
  "cta",
];

export const CASES_COUNT_OPTIONS = [4, 8, 12, 16, 20] as const;

function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function extractRegion(keywords: string, siteName: string): string {
  const source = `${keywords} ${siteName}`;
  const match = source.match(
    /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|강남|강북|강서|강동|서초|송파|마포|영등포|용산|성동|광진|동작|관악|노원|일산|분당|수원|성남|안양|부천|김포|파주|고양|화성|평택|천안|청주|전주|창원|김해|거제|울산|제주)[^\s,]*/
  );
  if (match) return match[1];
  const first = keywords.split(/[,\n]/)[0]?.trim() || siteName;
  return first.replace(/철거|폐업|원상복구|전문|센터/g, "").trim() || "지역";
}

const DESIGN_VARIANTS: DesignVariant[] = ["classic", "modern", "bold"];
const HEADER_STYLES: HeaderStyle[] = ["sticky", "overlay", "minimal", "hidden"];

const HERO_BADGES = [
  "폐업 철거, 부담 없이 마무리",
  "전문 철거 원스톱 파트너",
  "빠르고 깔끔한 철거 솔루션",
  "지역 맞춤 철거 전문",
  "믿을 수 있는 철거 파트너",
  "합리적 견적 · 신속 시공",
  "폐업지원금과 철거를 한 번에",
  "현장 맞춤 철거 컨설팅",
];

const HERO_INTROS = [
  "폐업지원금 신청부터 철거·원상복구까지",
  "현장 실측부터 마감·인허가까지",
  "철거 계획 수립부터 완공·정리까지",
  "무료 방문 견적부터 원상복구까지",
  "상담부터 폐기물 처리까지",
  "일정 조율부터 깔끔한 마감까지",
];

const HERO_CLOSINGS = [
  "가 한 번에 해결합니다",
  "가 책임지고 진행합니다",
  "와 함께라면 걱정 없습니다",
  "이 든든하게 도와드립니다",
  "가 끝까지 함께합니다",
];

const ABOUT_SNIPPETS = [
  "지역 특성에 맞춘 맞춤형 철거 계획을 제안합니다.",
  "현장 조건을 꼼꼼히 확인한 뒤 합리적인 견적을 드립니다.",
  "철거 전·후까지 책임지는 원스톱 서비스를 제공합니다.",
  "빠른 일정 조율과 깔끔한 마감으로 만족도를 높입니다.",
  "폐업지원금 활용까지 함께 검토해 비용 부담을 줄여 드립니다.",
  "소음·먼지·안전 관리까지 꼼꼼히 챙기는 현장 운영을 지향합니다.",
];

const SUPPORT_BLURBS = [
  "지원금 범위 안에서 철거 공사를 계획할 수 있도록 신청부터 시공까지 전 과정을 함께 진행합니다.",
  "폐업 일정에 맞춰 지원금 신청과 철거 일정을 동시에 조율해 드립니다.",
  "현장 조건에 맞는 지원금 활용 방안을 먼저 상담한 뒤 철거 범위를 제안합니다.",
  "지원금 수급 가능 여부부터 철거 견적까지 한 번에 확인할 수 있습니다.",
];

const WHY_US_TITLES = [
  "합리적인 견적을 제안할 수 있는 이유",
  "고객이 다시 찾는 이유",
  "믿고 맡길 수 있는 이유",
  "현장 만족도가 높은 이유",
];

const STATS_SETS: TenantStatItem[][] = [
  [
    { label: "누적 상담 건수", value: "4,200+", suffix: "" },
    { label: "월 평균 시공", value: "85+", suffix: "건" },
    { label: "무료 방문 견적", value: "100", suffix: "%" },
    { label: "지원금 수급 성공률", value: "96", suffix: "%" },
  ],
  [
    { label: "현장 방문 견적", value: "3,800+", suffix: "건" },
    { label: "평균 시공 기간", value: "3~5", suffix: "일" },
    { label: "재의뢰 고객", value: "78", suffix: "%" },
    { label: "지역 커버리지", value: "전국", suffix: "" },
  ],
  [
    { label: "연간 시공 실적", value: "1,200+", suffix: "건" },
    { label: "견적 만족도", value: "98", suffix: "%" },
    { label: "당일 상담 응답", value: "95", suffix: "%" },
    { label: "현장 정리 완료율", value: "100", suffix: "%" },
  ],
  [
    { label: "평균 견적 응답", value: "2", suffix: "시간" },
    { label: "야간·주말 상담", value: "가능", suffix: "" },
    { label: "현장 사진 공유", value: "100", suffix: "%" },
    { label: "추가 비용 분쟁", value: "0", suffix: "건" },
  ],
];

const WHY_US_SETS: TenantWhyUsItem[][] = [
  [
    { num: "01", title: "현장 전문 인력", highlight: "80+명", sub: "전국 배치" },
    { num: "02", title: "폐업·지원금 컨설팅", highlight: "전담 상담", sub: "추가 수수료 없음" },
    { num: "03", title: "집기·비품 처리", highlight: "합리적 매입", sub: "철거비 절감" },
  ],
  [
    { num: "01", title: "무료 방문 견적", highlight: "당일 가능", sub: "전국 출장" },
    { num: "02", title: "일정 맞춤 시공", highlight: "야간·주말", sub: "협의 가능" },
    { num: "03", title: "원상복구 대응", highlight: "건물주 협의", sub: "분쟁 예방" },
  ],
  [
    { num: "01", title: "폐기물 분리 수거", highlight: "즉시 처리", sub: "민원 최소화" },
    { num: "02", title: "지원금 서류 대행", highlight: "맞춤 안내", sub: "신청 동행" },
    { num: "03", title: "견적 투명 공개", highlight: "항목별", sub: "추가비용 없음" },
  ],
];

const PROCESS_SETS: TenantProcessItem[][] = [
  [
    { step: "01", title: "전화·상담 접수", desc: "철거 범위와 일정을 간단히 확인합니다" },
    { step: "02", title: "현장 방문 견적", desc: "방문 후 상세 견적과 일정을 안내합니다" },
    { step: "03", title: "철거·지원금 진행", desc: "공사와 지원금 신청을 함께 진행합니다" },
  ],
  [
    { step: "01", title: "온라인·전화 상담", desc: "업종·평수·일정을 먼저 파악합니다" },
    { step: "02", title: "현장 실측·견적", desc: "사진·동영상으로도 사전 견적이 가능합니다" },
    { step: "03", title: "철거·정리·복구", desc: "공사 후 폐기물까지 마무리합니다" },
  ],
  [
    { step: "01", title: "지원금 가능 여부 확인", desc: "폐업 일정에 맞춰 신청 타이밍을 안내합니다" },
    { step: "02", title: "맞춤 철거 계획 수립", desc: "현장 구조에 맞는 공법을 제안합니다" },
    { step: "03", title: "시공·검수·인계", desc: "건물주 기준에 맞게 마감합니다" },
  ],
];

const REVIEW_POOL: TenantReviewItem[] = [
  {
    name: "문*화",
    business: "뷰티샵 폐업",
    text: "지원금 활용이 가능한지 몰랐는데, 상담부터 서류까지 꼼꼼히 챙겨주셔서 비용 부담 없이 마무리했습니다.",
    rating: 5,
  },
  {
    name: "백*진",
    business: "브런치 카페 폐업",
    text: "폐업 일정이 촉박했는데 현장 방문 견적 후 바로 일정 잡아주셔서 일정 내에 끝냈습니다.",
    rating: 5,
  },
  {
    name: "박*길",
    business: "IT스타트업 폐업",
    text: "임대차 원상복구 기준이 까다로웠는데, 건물주와 직접 조율해 주셔서 분쟁 없이 계약 종료했습니다.",
    rating: 5,
  },
  {
    name: "한*주",
    business: "영어학원 폐업",
    text: "여러 업체 견적을 받아봤는데, 지원금 상담과 철거 일정을 한꺼번에 정리해 줄 수 있는 곳이 여기뿐이었습니다.",
    rating: 5,
  },
  {
    name: "이*희",
    business: "의류 매장 폐업",
    text: "서류 준비가 막막했는데 차근차근 안내해 주셔서 큰 도움이 됐습니다.",
    rating: 5,
  },
  {
    name: "김*덕",
    business: "피트니스센터 폐업",
    text: "운동기구가 많아 난이도가 높았는데, 경험 있는 팀이 와서 빠르게 처리했습니다.",
    rating: 5,
  },
  {
    name: "최*영",
    business: "음식점 폐업",
    text: "주방 설비 철거가 까다로웠는데 일정과 비용 모두 투명하게 안내해 주셔서 믿고 맡겼습니다.",
    rating: 5,
  },
  {
    name: "정*수",
    business: "사무실 이전",
    text: "야간 작업이 필요했는데 민원 없이 조용히 마무리해 주셔서 주변 상가와도 문제가 없었습니다.",
    rating: 5,
  },
];

const CASE_TEMPLATES = [
  { title: "{region} 대형 피트니스센터 철거", type: "철거·원상복구" },
  { title: "{region} 소형 배달주방 철거", type: "철거·원상복구" },
  { title: "{region} 중형 사무공간 철거", type: "철거·원상복구" },
  { title: "{region} 사무실 인테리어 철거", type: "철거·원상복구" },
  { title: "{region} 음식점 인테리어 철거", type: "철거" },
  { title: "{region} 소매매장 철거", type: "철거" },
  { title: "{region} 상가 내부 철거", type: "철거·원상복구" },
  { title: "{region} 식당 주방 철거", type: "철거·원상복구" },
  { title: "{region} 상가 리모델링 철거", type: "철거·원상복구" },
  { title: "{region} 소규모 공장 철거", type: "철거·원상복구" },
  { title: "{region} 대형 사무실 철거", type: "철거·원상복구" },
  { title: "{region} 대형매장 폐기물 수거", type: "폐기물처리" },
  { title: "{region} 의료시설 인테리어 철거", type: "철거·원상복구" },
  { title: "{region} 카페 인테리어 철거", type: "철거·원상복구" },
  { title: "{region} 학원 인테리어 철거", type: "철거·원상복구" },
  { title: "{region} 뷰티샵 철거", type: "철거" },
  { title: "{region} 창고 부분 철거", type: "철거" },
  { title: "{region} 주거 공간 부분 철거", type: "철거" },
  { title: "{region} 병원 대기실 철거", type: "철거·원상복구" },
  { title: "{region} 프랜차이즈 매장 철거", type: "철거·원상복구" },
];

function pickCases(
  rng: () => number,
  count: number,
  region: string,
  maxImages: number
): TenantCaseItem[] {
  const imagePool = shuffle(
    Array.from({ length: maxImages }, (_, i) => i + 1),
    rng
  );
  const templates = shuffle(CASE_TEMPLATES, rng);
  return Array.from({ length: count }, (_, i) => ({
    id: `case-${i + 1}`,
    title: templates[i % templates.length].title.replace("{region}", region),
    type: templates[i % templates.length].type,
    imageIndex: imagePool[i % imagePool.length],
  }));
}

function pickSectionOrder(rng: () => number): HomeSectionId[] {
  const optionalHidden = shuffle(
    ["partner", "cta", "stats", "reviews"] as HomeSectionId[],
    rng
  );
  const hideCount = Math.floor(rng() * 2);
  const hidden = new Set(optionalHidden.slice(0, hideCount));
  const core = shuffle(
    DEFAULT_HOME_SECTION_ORDER.filter((id) => !hidden.has(id)),
    rng
  );
  return core;
}

/** 서브도메인 시드로 사이트마다 다른 문구·레이아웃·이미지 패키지 생성 */
export function pickTenantContentPackage(
  seed: string,
  siteName: string,
  keywords: string,
  bodyContent: string,
  imageCount = 20
): TenantContentData {
  const layoutSeed = hashString(seed);
  const rng = createRng(layoutSeed);
  const maxImages = Math.max(4, imageCount);
  const region = extractRegion(keywords, siteName);
  const firstKeyword = keywords.split(/[,\n]/)[0]?.trim() || siteName;
  const intro = pickOne(HERO_INTROS, rng);
  const closing = pickOne(HERO_CLOSINGS, rng);
  const about = bodyContent.trim() || pickOne(ABOUT_SNIPPETS, rng);
  const casesCount = pickOne([...CASES_COUNT_OPTIONS], rng);
  const heroImageIndex = Math.floor(rng() * maxImages) + 1;
  const supportImageIndex = Math.floor(rng() * maxImages) + 1;
  const reviews = shuffle(REVIEW_POOL, rng).slice(0, 4 + Math.floor(rng() * 3));

  return {
    layoutSeed,
    headerStyle: pickOne(HEADER_STYLES, rng),
    sectionOrder: pickSectionOrder(rng),
    designVariant: pickOne(DESIGN_VARIANTS, rng),
    heroBadge: pickOne(HERO_BADGES, rng),
    heroIntro: intro,
    heroClosing: closing,
    heroLead: `${intro}\n${siteName}${closing}`,
    heroImageIndex,
    supportImageIndex,
    aboutText: about,
    supportBlurb: pickOne(SUPPORT_BLURBS, rng),
    whyUsTitle: pickOne(WHY_US_TITLES, rng),
    whyUsItems: pickOne(WHY_US_SETS, rng),
    processSteps: pickOne(PROCESS_SETS, rng),
    reviews,
    reviewsSatisfaction: `${94 + Math.floor(rng() * 5)}%`,
    stats: pickOne(STATS_SETS, rng),
    casesCount,
    casesItems: pickCases(rng, casesCount, region, maxImages),
    tagline: firstKeyword.includes("철거")
      ? `${firstKeyword} 전문 · ${siteName}`
      : `${siteName} | ${firstKeyword} 전문`,
    description: about.slice(0, 160) || `${siteName} 공식 사이트`,
    keywords,
    body: bodyContent || about,
  };
}

/** DB에 저장된 테넌트 UI — 없으면 시드로 생성 (기존 사이트 호환) */
export function resolveTenantContentData(
  content: TenantContentData | undefined | null,
  subdomain: string,
  siteName: string,
  keywords = "",
  bodyContent = "",
  imageCount = 20
): TenantContentData {
  if (content?.layoutSeed != null && content.sectionOrder?.length) {
    return content;
  }

  const pkg = pickTenantContentPackage(
    subdomain,
    siteName,
    keywords || content?.keywords || "",
    bodyContent || content?.body || "",
    imageCount
  );

  return {
    ...pkg,
    tagline: content?.tagline || pkg.tagline,
    keywords: content?.keywords || pkg.keywords,
    body: content?.body || pkg.body,
    description: content?.description || pkg.description,
    aboutText: content?.aboutText || pkg.aboutText,
  };
}

export function getDefaultStats(): TenantStatItem[] {
  return STATS_SETS[0];
}
