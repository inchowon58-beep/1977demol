import type { SiteConfig } from "./site-config-types";
import type { SeoFaq } from "./data";

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
- 섹션 사이에 이미지 자리표시자를 정확히 3번 삽입: {{image1}}, {{image2}}, {{image3}}
  (각각 별도 줄에 단독으로, h2 또는 h3 바로 다음에 배치)
- 매번 다른 구성과 문장으로 작성
- 자주 묻는 질문(FAQ) 3개: 키워드와 관련된 실질적 질문과 답변 (답변 2문장 이상, 토큰 사용)

권장 h2 구성 예시:
1) 키워드 소개 및 {{brandName}} 안내
2) 철거 비용·견적 기준
3) 폐업지원금 활용 방법
4) 철거·원상복구 진행 절차
5) 현장 안전·폐기물 처리
6) 상담 및 문의 안내
`;

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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `당신은 폐업철거·상가철거 SEO 전문 작가입니다. 네이버 검색 최적화를 고려하여 한국어 HTML 콘텐츠를 작성하세요.

업체 정보 (본문에 아래 토큰을 그대로 사용하세요):
- 상호: {{brandName}} ({{companyName}})
- 대표: {{representative}}
- 연락처: {{phone}}
- 지원금: 기본 {{supportBase}}, 추가 {{supportExtra}}, 최대 {{supportMax}}
- 특징: 폐업지원금 신청 대행, 무료 방문 견적, 철거·원상복구 원스톱, 전국 시공

키워드: "${keyword}"
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
  return [
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
  ];
}

function generateFallbackContent(
  keyword: string,
  site: SiteConfig
): GeneratedSeoContent {
  return {
    title: `${keyword} 전문 | {{brandName}}`,
    description: `${keyword} 무료 방문 견적, 폐업지원금 신청 대행. {{brandName}}이 철거부터 원상복구까지 원스톱으로 해결해 드립니다.`,
    content: `
<h2>${keyword} — {{brandName}} 전문 안내</h2>
<p>{{companyName}} {{brandName}}은 폐업지원금 신청부터 ${keyword}, 원상복구까지 한 번에 진행하는 전국 폐업철거 전문 업체입니다. 상가·음식점·학원·사무실 등 업종별로 현장 조건이 다르기 때문에, 막연한 단가보다 현장 방문 후 맞춤 견적을 받는 것이 중요합니다.</p>
<p>대표 {{representative}}가 이끄는 전문 인력이 철거 일정, 소음·분진 관리, 폐기물 반출까지 책임지고 진행합니다. ${keyword}를 검토 중이시라면 먼저 전화 {{phone}}로 간단히 상담해 보세요.</p>
{{image1}}

<h2>${keyword} 비용은 어떻게 책정되나요?</h2>
<p>철거 비용은 평수, 층수, 업종(주방 설비·냉난방·인테리어 마감), 원상복구 수준에 따라 달라집니다. 단순 철거만 필요한 경우와 임대인 요구에 맞춘 원상복구가 포함된 경우 견적 차이가 클 수 있습니다.</p>
<p>{{brandName}}은 현장 실측 후 항목별 견적서를 제공합니다. 집기·비품 매입이 가능한 경우 철거 비용을 일부 절감할 수도 있어, 폐업 정리와 함께 비용 효율을 높일 수 있습니다.</p>
<ul>
<li>철거 범위: 집기, 고정 설비, 천장·벽체 마감 등</li>
<li>원상복구: 도배, 바닥, 전기·급배수 원위치 등</li>
<li>폐기물: 종량·지정 폐기물 분리 반출</li>
</ul>

<h2>폐업지원금과 함께 진행하기</h2>
<p>폐업철거지원금 {{supportBase}}, 추가지원금 {{supportExtra}}으로 최대 {{supportMax}}까지 지원받을 수 있습니다. 지역·업종·평수·폐업 시점에 따라 지원 가능 여부와 금액이 달라지므로, 철거 전 {{brandName}}과 함께 지원금 신청 가능 여부를 확인하는 것을 권장합니다.</p>
<p>지원금 신청 서류 준비부터 철거 완료 후 정산까지 원스톱으로 안내해 드립니다.</p>
{{image2}}

<h2>${keyword} 진행 절차</h2>
<p>체계적인 일정 관리가 폐업·철거 스트레스를 줄여 줍니다. {{brandName}}의 표준 진행 순서는 다음과 같습니다.</p>
<ul>
<li>Step 1. 전화·상담 접수 — 희망 일정, 평수, 업종 확인</li>
<li>Step 2. 무료 현장 방문 견적 — 철거·복구 범위 확정</li>
<li>Step 3. 계약 및 폐업지원금 신청 대행</li>
<li>Step 4. 철거·원상복구 시공 및 폐기물 처리</li>
<li>Step 5. 임대인·관리사무소 인수 확인</li>
</ul>

<h2>현장 안전과 폐기물 처리</h2>
<p>상가 철거는 소음, 분진, 안전 사고 예방이 중요합니다. {{brandName}}은 작업 전 보양과 안전 구역 설정을 진행하고, 건축물·소방 관련 규정을 준수합니다. 폐기물은 재활용 가능 품목과 일반 폐기물을 분리해 지정 방식으로 반출합니다.</p>
<p>인근 상가·주민 민원을 최소화할 수 있도록 작업 시간대도 협의 가능합니다.</p>
{{image3}}

<h2>상담 및 문의</h2>
<p>${keyword} 관련 문의는 {{phone}}으로 연락 주세요. 평일·주말 상담 가능 여부와 방문 견적 일정을 안내해 드립니다. {{brandName}}이 책임지고 도와드리겠습니다.</p>
`.trim(),
    faqs: buildDefaultFaqs(keyword, site),
  };
}
