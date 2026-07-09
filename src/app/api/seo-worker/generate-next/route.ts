import { NextResponse } from "next/server";
import {
  processNextGenerationJob,
  verifyWorkerRequest,
} from "@/lib/generation-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * VM SEO 생성 프로그램 — 대기열에서 1개 꺼내 Gemini 생성
 * POST /api/seo-worker/generate-next
 *
 * quota.shouldPause === true → 429 + Retry-After (KST 자정까지)
 */
export async function POST(request: Request) {
  if (!(await verifyWorkerRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processNextGenerationJob();

  const headers: Record<string, string> = {};
  if (result.retryAfterSec) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }

  let httpStatus = 200;
  if (result.status === "quota") {
    httpStatus = 429;
  } else if (!result.ok && result.status !== "empty") {
    httpStatus = 503;
  }

  return NextResponse.json(result, { status: httpStatus, headers });
}
