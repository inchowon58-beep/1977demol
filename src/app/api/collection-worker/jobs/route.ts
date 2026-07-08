import { NextRequest, NextResponse } from "next/server";
import {
  getCollectionSiteUrl,
  getPendingJobsForWorker,
  normalizeCollectionSiteUrl,
  reportCollectionResults,
  verifyWorkerRequest,
} from "@/lib/collection-queue";

export const dynamic = "force-dynamic";

/**
 * VM 수집 프로그램 — 대기 중인 웹문서 URL 목록 조회
 * GET /api/collection-worker/jobs?siteUrl=https://example.com
 * Authorization: Bearer {COLLECTION_WORKER_SECRET}
 */
export async function GET(request: NextRequest) {
  if (!(await verifyWorkerRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramSite = request.nextUrl.searchParams.get("siteUrl")?.trim();
  const siteUrl = paramSite
    ? normalizeCollectionSiteUrl(paramSite)
    : await getCollectionSiteUrl();
  const jobs = await getPendingJobsForWorker(siteUrl);

  return NextResponse.json({
    siteUrl,
    count: jobs.length,
    jobs: jobs.map((j) => ({
      id: j.id,
      siteUrl: j.siteUrl,
      pageUrl: j.pageUrl,
      keyword: j.keyword,
      slug: j.slug,
      requestedAt: j.requestedAt,
    })),
  });
}

/**
 * VM 수집 프로그램 — 처리 결과 보고
 * POST body: { results: [{ id, status: "submitted"|"failed", error? }] }
 */
export async function POST(request: NextRequest) {
  if (!(await verifyWorkerRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const results = body.results as
    | { id: string; status: "submitted" | "failed"; error?: string }[]
    | undefined;

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: "results 배열 필요" }, { status: 400 });
  }

  const updated = await reportCollectionResults(results);
  return NextResponse.json({ ok: true, updated });
}
