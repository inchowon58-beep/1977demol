import { NextResponse } from "next/server";
import {
  getGenerationQueueSummary,
  getPendingGenerationJobsForWorker,
  verifyWorkerRequest,
} from "@/lib/generation-queue";

export const dynamic = "force-dynamic";

/**
 * VM SEO 생성 프로그램 — 대기 키워드 목록 조회
 * GET /api/seo-worker/jobs
 * Authorization: Bearer {COLLECTION_WORKER_SECRET}
 */
export async function GET(request: Request) {
  if (!(await verifyWorkerRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [jobs, summary] = await Promise.all([
    getPendingGenerationJobsForWorker(),
    getGenerationQueueSummary(),
  ]);

  return NextResponse.json({
    count: jobs.length,
    summary,
    jobs: jobs.map((j) => ({
      id: j.id,
      keyword: j.keyword,
      requestedAt: j.requestedAt,
    })),
  });
}
