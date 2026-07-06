import { NextResponse } from "next/server";
import {
  processNextGenerationJob,
  verifyWorkerRequest,
} from "@/lib/generation-queue";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * VM SEO 생성 프로그램 — 대기열에서 1개 꺼내 Gemini 생성
 * POST /api/seo-worker/generate-next
 * Authorization: Bearer {COLLECTION_WORKER_SECRET}
 */
export async function POST(request: Request) {
  if (!(await verifyWorkerRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processNextGenerationJob();

  return NextResponse.json(result, {
    status: result.ok || result.status === "empty" ? 200 : 503,
  });
}
