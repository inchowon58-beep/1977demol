import { NextResponse } from "next/server";
import {
  getWorkerGenerationStatus,
  verifyWorkerRequest,
} from "@/lib/generation-queue";

export const dynamic = "force-dynamic";

/**
 * VM SEO 생성 프로그램 — 대기 키워드 목록 + 일일 한도 상태
 * GET /api/seo-worker/jobs
 * Authorization: Bearer {COLLECTION_WORKER_SECRET}
 *
 * quota.shouldPause === true 이면 generate-next 호출하지 말고 retryAfterSec 만큼 대기
 */
export async function GET(request: Request) {
  if (!(await verifyWorkerRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pendingJobs, summary, quota, scope } = await getWorkerGenerationStatus();

  const body = {
    count: pendingJobs.length,
    dailyLimit: quota.limit,
    usedToday: quota.used,
    remainingToday: quota.remaining,
    summary,
    quota,
    shouldPause: quota.shouldPause,
    retryAfterSec: quota.shouldPause ? quota.retryAfterSec : undefined,
    nextEligibleAt: quota.shouldPause ? quota.nextEligibleAt : undefined,
    tenant: scope,
    jobs: pendingJobs.map((j) => ({
      id: j.id,
      keyword: j.keyword,
      requestedAt: j.requestedAt,
    })),
  };

  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
  };
  if (quota.shouldPause && quota.retryAfterSec) {
    headers["Retry-After"] = String(quota.retryAfterSec);
  }

  return NextResponse.json(body, { headers });
}
