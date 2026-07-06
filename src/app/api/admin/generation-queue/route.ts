import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  enqueueGenerationKeywords,
  getGenerationQueueSummary,
  getRecentGenerationJobs,
} from "@/lib/generation-queue";
import { parseKeywordList, MAX_BULK_KEYWORDS } from "@/lib/parse-keywords";
import { getServicePeriodStatus } from "@/lib/service-period";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [summary, recent] = await Promise.all([
    getGenerationQueueSummary(),
    getRecentGenerationJobs(20),
  ]);

  return NextResponse.json(
    { summary, recent },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await getServicePeriodStatus();
  if (!service.active) {
    return NextResponse.json(
      { error: "사용 기간이 만료되었습니다. 마스터 설정에서 기간 연장 후 다시 시도하세요." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  let keywords: string[] = [];

  if (Array.isArray(body.keywords)) {
    keywords = body.keywords.map((k: unknown) => String(k).trim()).filter(Boolean);
  } else if (typeof body.text === "string") {
    keywords = parseKeywordList(body.text);
  } else {
    return NextResponse.json(
      { error: "keywords 배열 또는 text 문자열을 보내주세요." },
      { status: 400 }
    );
  }

  if (keywords.length === 0) {
    return NextResponse.json({ error: "등록할 키워드가 없습니다." }, { status: 400 });
  }

  if (keywords.length > MAX_BULK_KEYWORDS) {
    return NextResponse.json(
      { error: `한 번에 최대 ${MAX_BULK_KEYWORDS}개까지 등록할 수 있습니다.` },
      { status: 400 }
    );
  }

  const result = await enqueueGenerationKeywords(keywords);

  return NextResponse.json({
    success: true,
    added: result.added,
    skipped: result.skipped,
    skippedReasons: result.skippedReasons,
    message:
      result.added > 0
        ? `${result.added}개 키워드를 VM 생성 대기열에 등록했습니다. VM이 순서대로 1개씩 생성합니다.`
        : "등록된 키워드가 없습니다. (중복 또는 이미 존재)",
  });
}
