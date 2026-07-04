import type { SiteConfig } from "./site-config-types";
import type { SeoFaq } from "./data";
import { extractRegionFromKeyword } from "./region-parse";

interface GenerateOptions {
  keyword: string;
  apiKey: string;
  site: SiteConfig;
}

export interface GeneratedSeoContent {
  title: string;
  description: string;
  content: string;
  slug?: string;
  faqs: SeoFaq[];
}

const CONTENT_RULES = `
작성 조건:
- 키워드를 자연스럽게 본문 전체에 5~8회 포함
- 업체명·전화번호는 반드시 {{brandName}}, {{phone}} 등 토큰으로만 표기 (직접 입력 금지)
- 폐업철거, 상가철거, 원상복구, 폐업지원금 관점으로 작성
- 신뢰감 있는 전문가 톤, 허위·과장 금지
- h2, h3, p, ul 태그만 사용 (img 태그 직접 사용 금지)
- 본문 순수 텍스트 기준 **2800자 이상** (짧으면 안 됨)
- h2 섹션 **최소 5개**, 각 섹션마다 p 2~3문단 또는 ul 목록 포함
- 이미지는 시스템에서 본문에 자동 삽입되므로 img 태그·이미지 플레이스홀더 사용 금지
- 다른 SEO 페이지와 문장·사례·섹션 순서가 겹치지 않게 작성
- 자주 묻는 질문(FAQ) 3개: 키워드와 관련된 실질적 질문과 답변 (답변 2문장 이상, 토큰 사용)
`;

const WRITING_ANGLES = [
  "현장 실무자 관점에서 일정·안전·민원 대응을 중심으로",
  "폐업 사업자 입장에서 비용·지원금·임대차 종료 일정을 중심으로",
  "임대인·관리사무소 인수 기준과 원상복구 범위를 중심으로",
  "업종별(음식점·학원·사무실) 철거 차이와 주의사항을 중심으로",
  "견적 항목 분해와 숨은 비용 예방을 중심으로",
  "철거 후 폐기물 분리·반출과 환경 규정을 중심으로",
];

function hashKeyword(keyword: string): number {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = (hash << 5) - hash + keyword.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickAngle(keyword: string): string {
  const idx = hashKeyword(keyword) % WRITING_ANGLES.length;
  return WRITING_ANGLES[idx];
}

export async function generateSeoContent({
  keyword,
  apiKey,
  site,
}: GenerateOptions): Promise<GeneratedSeoContent> {
  if (!apiKey) {
    return generateFallbackContent(keyword, site);
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const region = extractRegionFromKeyword(keyword);
  const angle = pickAngle(keyword);
  const uniqueSeed = `${keyword}-${hashKeyword(keyword)}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 1.1,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  });

  const prompt = `당신은 폐업철거·상가철거 SEO 전문 작가입니다. 네이버 검색 최적화를 고려하여 한국어 HTML 콘텐츠를 작성하세요.

업체 정보 (본문에 아래 토큰을 그대로 사용하세요):
- 상호: {{brandName}} ({{companyName}})
- 대표: {{representative}}
- 연락처: {{phone}}
- 지원금: 기본 {{supportBase}}, 추가 {{supportExtra}}, 최대 {{supportMax}}
- 특징: 폐업지원금 신청 대행, 무료 방문 견적, 철거·원상복구 원스톱, 전국 시공

키워드: "${keyword}"
${region ? `지역 맥락: ${region} 지역 상가·폐업철거` : ""}
작성 관점: ${angle}
고유 시드(다른 글과 중복 금지): ${uniqueSeed}

중요: 이전에 작성한 다른 키워드 페이지와 동일한 문장·구조·사례를 재사용하지 마세요. 키워드와 지역에 맞는 구체적인 상황을 새로 작성하세요.
${CONTENT_RULES}

JSON 형식으로만 응답:
{
  "title": "60자 이내 SEO 제목 ({{brandName}} 토큰 사용 가능)",
  "description": "150자 이내 메타 설명 (토큰 사용 가능)",
  "slug": "영문 소문자 URL slug",
  "content": "HTML 본문",
  "faqs": [
    { "question": "질문1", "answer": "답변1" },
    { "question": "질문2", "answer": "답변2" },
    { "question": "질문3", "answer": "답변3" }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      title: string;
      description: string;
      content: string;
      slug?: string;
      faqs?: SeoFaq[];
    };

    if (!parsed.content || parsed.content.length < 800) {
      throw new Error("Content too short");
    }

    return {
      title: parsed.title,
      description: parsed.description,
      content: parsed.content,
      slug: parsed.slug,
      faqs: normalizeFaqs(parsed.faqs, keyword, site),
    };
  } catch {
    return generateFallbackContent(keyword, site);
  }
}

function normalizeFaqs(
  faqs: SeoFaq[] | undefined,
  keyword: string,
  site: SiteConfig
): SeoFaq[] {
  const valid = (faqs || []).filter((f) => f.question?.trim() && f.answer?.trim());
  if (valid.length >= 3) return valid.slice(0, 3);
  return buildDefaultFaqs(keyword, site);
}

export function buildDefaultFaqs(keyword: string, site: SiteConfig): SeoFaq[] {
  const region = extractRegionFromKeyword(keyword);
  const regionNote = region ? `${region} 지역 ` : "";

  const faqSets: SeoFaq[][] = [
    [
      {
        question: `${keyword} 비용은 어떻게 산정되나요?`,
        answer: `평수, 업종, 원상복구 범위, 폐기물 처리량에 따라 달라집니다. {{brandName}}은 무료 현장 방문 견적을 제공하며, 견적서에 철거·복구·철거 후 정리 항목을 구분해 안내합니다. 폐업지원금 활용 시 실제 부담을 줄일 수 있습니다.`,
      },
      {
        question: `폐업지원금과 함께 ${keyword}가 가능한가요?`,
        answer: `네. {{brandName}}은 폐업지원금 신청부터 철거·원상복구까지 원스톱으로 지원합니다. 기본 {{supportBase}}, 추가 {{supportExtra}}로 최대 {{supportMax}}까지 안내받으실 수 있으며, 업종·지역·평수에 따라 달라질 수 있습니다.`,
      },
      {
        question: `${keyword} 상담은 어떻게 하나요?`,
        answer: `전화 {{phone}}로 상담 후 무료 현장 방문 견적을 진행합니다. 폐업 예정일, 철거 범위, 임대차 계약 종료일을 알려주시면 일정에 맞춘 맞춤 안내를 해 드립니다.`,
      },
    ],
    [
      {
        question: `${regionNote}${keyword} 견적은 무료인가요?`,
        answer: `{{brandName}}은 현장 방문 후 항목별 견적서를 무료로 제공합니다. 철거만 필요한 경우와 원상복구가 포함된 경우를 나눠 비교할 수 있어 의사결정에 도움이 됩니다.`,
      },
      {
        question: `${keyword} 시 공사 기간은 얼마나 걸리나요?`,
        answer: `평수와 철거 범위에 따라 보통 1~5일 정도입니다. 임대차 종료일이 정해져 있다면 {{phone}}로 연락 주시면 일정에 맞춘 작업 계획을 안내해 드립니다.`,
      },
      {
        question: `원상복구까지 맡길 수 있나요?`,
        answer: `네. {{brandName}}은 철거와 함께 도배·바닥·전기 원위치 등 임대인 요구에 맞는 원상복구까지 진행합니다. 폐업지원금과 병행 시 비용 부담을 줄일 수 있습니다.`,
      },
    ],
    [
      {
        question: `${keyword} 전에 준비할 서류가 있나요?`,
        answer: `임대차 계약서, 사업자등록 관련 자료, 폐업 예정일 등을 준비해 주시면 지원금 신청과 견적 산정이 빠릅니다. {{brandName}}이 필요 서류를 단계별로 안내합니다.`,
      },
      {
        question: `주말·야간 철거도 가능한가요?`,
        answer: `상가 특성과 인근 민원을 고려해 작업 시간을 협의합니다. 음식점·학원 등 업종에 따라 야간 작업이 유리한 경우도 있어 현장 상담 시 일정을 조율합니다.`,
      },
      {
        question: `집기·비품은 어떻게 처리하나요?`,
        answer: `매입 가능한 집기는 철거 비용에서 공제할 수 있고, 불가 품목은 지정 방식으로 반출합니다. {{phone}} 상담 시 보유 집기 목록을 알려주시면 반영해 드립니다.`,
      },
    ],
  ];

  const idx = hashKeyword(keyword) % faqSets.length;
  return faqSets[idx];
}

type FallbackBuilder = (keyword: string, region: string | null) => string;

const FALLBACK_VARIANTS: FallbackBuilder[] = [
  (keyword, region) => {
    const loc = region ? `${region} ` : "";
    return `
<h2>${loc}${keyword} — {{brandName}} 맞춤 안내</h2>
<p>{{companyName}} {{brandName}}은 ${region ? `${region}을 포함한 ` : ""}전국 폐업철거 현장을 다루며, ${keyword} 문의가 많은 편입니다. 상가 유형마다 주방·냉난방·마감재 구성이 달라 동일 평수라도 견적 차이가 날 수 있습니다.</p>
<p>대표 {{representative}} 팀이 현장 실측 후 철거·원상복구·폐기물 반출을 한 번에 정리해 드립니다. 먼저 {{phone}}로 희망 일정과 평수를 알려주시면 빠르게 안내합니다.</p>
{{image1}}

<h2>${keyword} 견적이 달라지는 이유</h2>
<p>층수, 엘리베이터 유무, 야간 작업 여부, 임대인이 요구하는 복구 수준이 비용에 영향을 줍니다. 특히 ${region || "해당"} 상권은 건물 연식과 관리 규정이 제각각이라 현장 확인 없이 단가만 비교하기 어렵습니다.</p>
<p>{{brandName}}은 항목별 견적서를 제공해 숨은 비용을 줄입니다. 집기 매입이 가능하면 철거비 일부를 절감할 수도 있습니다.</p>
<ul>
<li>철거: 고정 집기, 천장·벽체 마감, 전기 분리</li>
<li>원상복구: 도배, 바닥, 급배수·배관 원위치</li>
<li>반출: 일반·지정 폐기물 분리 수거</li>
</ul>

<h2>폐업지원금 활용 가이드</h2>
<p>폐업철거지원금 {{supportBase}}, 추가 {{supportExtra}}로 최대 {{supportMax}}까지 지원 가능합니다. ${region ? `${region} ` : ""}지역·업종·평수에 따라 적용 조건이 달라지므로 철거 전 신청 가능 여부를 확인하는 것이 좋습니다.</p>
<p>{{brandName}}은 서류 준비부터 정산까지 대행해 드리며, 지원금과 철거 일정을 맞춰 진행합니다.</p>
{{image2}}

<h2>${keyword} 진행 순서</h2>
<ul>
<li>1단계: 전화 상담 — 폐업 예정일·평수·업종 확인</li>
<li>2단계: 무료 방문 견적 — 철거·복구 범위 확정</li>
<li>3단계: 계약 및 지원금 신청</li>
<li>4단계: 철거·원상복구 시공</li>
<li>5단계: 임대인 인수·현장 정리</li>
</ul>
<p>일정이 촉박한 경우 야간·주말 작업도 협의 가능합니다.</p>

<h2>안전·민원·폐기물 관리</h2>
<p>상가 철거는 소음·분진·안전 사고 예방이 핵심입니다. {{brandName}}은 작업 전 보양과 통로 확보를 진행하고, 건축·소방 관련 규정을 준수합니다.</p>
<p>인근 상가 민원을 줄이기 위해 작업 시간대를 조율하며, 재활용 가능 품목은 분리 반출합니다.</p>
{{image3}}

<h2>문의 안내</h2>
<p>${keyword} 관련 상담은 {{phone}}입니다. {{brandName}}이 ${region || "전국"} 현장 기준으로 맞춤 안내해 드립니다.</p>`.trim();
  },

  (keyword, region) => {
    const loc = region || "해당 지역";
    return `
<h2>${loc} ${keyword} 현장에서 자주 나오는 질문</h2>
<p>폐업을 앞둔 사업자분들이 가장 많이 묻는 것은 "얼마나 걸리나"와 "지원금을 쓸 수 있나"입니다. {{brandName}}은 {{phone}} 상담 시 이 두 가지를 먼저 정리해 드립니다.</p>
<p>{{companyName}}은 음식점·카페·학원·사무실 등 업종별 철거 경험이 풍부하며, ${keyword} 키워드로 찾으신 분들께 현장 맞춤 견적을 제공합니다.</p>
{{image1}}

<h2>업종별 ${keyword} 차이점</h2>
<p>음식점은 주방 후드·가스·배수 라인 분리가 추가되고, 학원은 칸막이·책상 고정물 철거가 들어갑니다. 사무실은 전기 배선과 바닥 마감 복구 비중이 큽니다.</p>
<p>${loc} 상권 특성을 반영해 필요 공정만 담은 견적을 제시합니다. 불필요한 복구 항목은 줄여 비용을 절감할 수 있습니다.</p>

<h2>비용 절감 포인트</h2>
<ul>
<li>집기·비품 매입으로 철거비 공제</li>
<li>폐업지원금 {{supportBase}} + {{supportExtra}} (최대 {{supportMax}})</li>
<li>철거·복구 일괄 진행으로 이중 출장비 절약</li>
<li>작업 일정 집중으로 임대료 부담 기간 단축</li>
</ul>
{{image2}}

<h2>임대차 종료일에 맞춘 일정</h2>
<p>임대인 인수일이 정해져 있으면 그 역산으로 철거 착수일을 잡아야 합니다. 원상복구 검수까지 여유를 두는 것이 중요합니다.</p>
<p>{{brandName}}은 대표 {{representative}} 담당 팀이 일정표를 공유하고, 지연 요인(엘리베이터 예약, 폐기물 반출 등)을 미리 조율합니다.</p>

<h2>원상복구 범위 확인</h2>
<p>계약서의 특약과 임대인 요구서를 기준으로 복구 범위를 확정합니다. 도배 한 번, 바닥 전체 교체 등 항목마다 단가 차이가 크므로 서면 견적을 권장합니다.</p>
<p>철거만 먼저 하고 복구는 별도 업체에 맡기면 일정·책임 소재가 나뉘어 불편할 수 있어, {{brandName}} 원스톱 진행을 많이 선택하십니다.</p>
{{image3}}

<h2>${keyword} 상담 연락처</h2>
<p>무료 방문 견적은 {{phone}}으로 예약하세요. ${loc} 및 인근 지역도 당일·익일 방문이 가능한 경우가 많습니다.</p>`.trim();
  },

  (keyword, region) => {
    return `
<h2>{{brandName}}이 ${region ? region + " " : ""}${keyword}를 다루는 방식</h2>
<p>철거는 단순 해체가 아니라 임대차 종료·지원금·민원까지 연결된 프로젝트입니다. {{companyName}}은 현장 사진과 항목 리스트를 기반으로 투명한 견적을 제공합니다.</p>
<p>키워드 ${keyword}로 검색하신 분들께는 폐업 일정, 평수, 업종 세 가지를 먼저 확인한 뒤 맞춤 안내를 드립니다.</p>
{{image1}}

<h2>견적서에 꼭 들어가야 할 항목</h2>
<ul>
<li>철거 대상 목록(고정물·설비·집기)</li>
<li>원상복구 상세(벽·바닥·천장·전기)</li>
<li>폐기물 종류·예상 용량·반출 방법</li>
<li>작업 일수·인력·장비·보양</li>
<li>지원금 적용 가능 여부 및 예상 실부담</li>
</ul>
<p>{{brandName}} 견적서는 위 항목을 구분해 작성하므로 다른 업체와 비교하기 쉽습니다.</p>

<h2>폐업지원금과 철거 동시 진행</h2>
<p>지원금은 신청 시점·폐업 요건·면적 등에 따라 달라집니다. 기본 {{supportBase}}, 추가 {{supportExtra}}, 합산 최대 {{supportMax}}까지 안내받을 수 있습니다.</p>
<p>서류 누락으로 지연되는 경우가 많아, {{brandName}}이 신청부터 완료까지 동행합니다.</p>
{{image2}}

<h2>${region || "현장"} 특성을 고려한 작업</h2>
<p>건물 형태(단층·복층·지하), 주차·반출 동선, 관리사무소 규정을 사전에 확인합니다. 엘리베이터 사용 시간 제한이 있는 건물은 야간 반출을 검토하기도 합니다.</p>
<p>소음 민원이 우려되는 상권은 주말·야간 작업을 분산해 진행합니다.</p>

<h2>철거 후 인수 체크리스트</h2>
<p>임대인과 함께 벽·바닥·천장, 전기·수도 마감 상태를 확인하고 사진을 남깁니다. 분쟁 예방을 위해 완료 사진을 제공합니다.</p>
<p>추가 복구 요청이 있으면 {{phone}}로 연락 주시면 신속히 대응합니다.</p>
{{image3}}

<h2>지금 상담 받기</h2>
<p>${keyword} — {{brandName}} {{phone}}. 무료 방문 견적과 지원금 가능 여부를 함께 안내해 드립니다.</p>`.trim();
  },

  (keyword, region) => {
    const area = region ? `${region} 일대 ` : "";
    return `
<h2>${area}${keyword} — 사업자를 위한 실전 가이드</h2>
<p>폐업 후 철거를 미루면 임대료와 관리비 부담이 커집니다. {{brandName}}은 {{phone}} 접수 후 빠르면 당일 방문 견적 일정을 잡아 드립니다.</p>
<p>{{companyName}} 대표 {{representative}}는 상가 철거 현장에서 발생하는 변수(숨은 배관, 석면 의심 자재 등)를 미리 점검해 일정 지연을 줄입니다.</p>
{{image1}}

<h2>철거 전 3가지 확인</h2>
<ul>
<li>임대차 계약의 원상복구 조항</li>
<li>폐업일·사업자 폐업 신고 일정</li>
<li>건물 관리규약(작업 시간·소음·반출 동선)</li>
</ul>
<p>위 세 가지가 정리되면 ${keyword} 견적이 훨씬 정확해집니다.</p>

<h2>지원금 {{supportMax}} 활용 시나리오</h2>
<p>기본 {{supportBase}}와 추가 {{supportExtra}}를 합쳐 실제 철거·복구 비용의 상당 부분을 충당할 수 있습니다. 업종·면적·지역에 따라 차이가 있으니 {{brandName}}과 사전 상담을 권합니다.</p>
<p>지원금 확정 전에도 견적과 일정 계획은 먼저 받아 두실 수 있습니다.</p>
{{image2}}

<h2>공정별 예상 소요</h2>
<p>소규모 사무실은 1~2일, 음식점 규모에 따라 3~5일이 일반적입니다. 원상복구 포함 시 추가 1~2일이 필요할 수 있습니다.</p>
<p>${region ? `${region} ` : ""}현장 여건에 맞춰 인력과 장비를 배치하며, 완료 후 폐기물 처리 증빙을 안내해 드립니다.</p>

<h2>왜 {{brandName}}인가</h2>
<p>폐업지원금 신청 대행, 철거, 원상복구, 폐기물 반출을 한 곳에서 진행해 책임 소재가 분명합니다. 여러 업체를 부르는 것보다 일정 조율이 수월합니다.</p>
<p>견적 항목을 숨기지 않고, 현장 사진과 함께 투명하게 안내합니다.</p>
{{image3}}

<h2>${keyword} 무료 견적</h2>
<p>전화 {{phone}} · {{brandName}}. ${area}인근 상가 철거도 문의 환영합니다.</p>`.trim();
  },
];

function generateFallbackContent(
  keyword: string,
  site: SiteConfig
): GeneratedSeoContent {
  const region = extractRegionFromKeyword(keyword);
  const variantIdx = hashKeyword(keyword) % FALLBACK_VARIANTS.length;
  const content = FALLBACK_VARIANTS[variantIdx](keyword, region);

  const titleVariants = [
    `${keyword} 전문 | {{brandName}}`,
    `${region ? region + " " : ""}${keyword} 견적·지원금 | {{brandName}}`,
    `{{brandName}} ${keyword} 원스톱 안내`,
    `${keyword} 무료 방문 견적 | {{brandName}}`,
  ];
  const descVariants = [
    `${keyword} 무료 방문 견적, 폐업지원금 신청 대행. {{brandName}}이 철거부터 원상복구까지 원스톱으로 해결해 드립니다.`,
    `${region ? region + " " : ""}${keyword} 현장 맞춤 견적. 폐업지원금 최대 {{supportMax}}, {{brandName}} 전문 시공.`,
    `{{brandName}} ${keyword} — 철거·원상복구·폐기물 반출. 전화 {{phone}} 무료 상담.`,
    `${keyword} 비용·일정·지원금 한번에. {{brandName}} 폐업철거 전문.`,
  ];

  const tIdx = hashKeyword(keyword + "t") % titleVariants.length;
  const dIdx = hashKeyword(keyword + "d") % descVariants.length;

  return {
    title: titleVariants[tIdx],
    description: descVariants[dIdx],
    content,
    faqs: buildDefaultFaqs(keyword, site),
  };
}
