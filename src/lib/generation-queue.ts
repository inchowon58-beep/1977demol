import {
  getGenerationQueue,
  getPages,
  saveGenerationQueue,
  type GenerationJob,
  type GenerationJobStatus,
  type GenerationQueueData,
} from "./data";
import { normalizeSeoKeyword } from "./seo-keyword";
import { createSeoPageFromKeyword, SeoCreateError } from "./seo-page-create";
import { verifyWorkerRequest } from "./collection-queue";

export type { GenerationJob, GenerationJobStatus };
export { verifyWorkerRequest };

const STALE_PROCESSING_MS = 15 * 60 * 1000;

export interface GenerationQueueSummary {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

function normalizeKeywordKey(keyword: string): string {
  return normalizeSeoKeyword(keyword).replace(/\s/g, "").toLowerCase();
}

async function releaseStaleProcessingJobs(queue: GenerationQueueData): Promise<boolean> {
  const now = Date.now();
  let changed = false;

  for (const job of queue.jobs) {
    if (job.status !== "processing") continue;
    const started = job.startedAt ? Date.parse(job.startedAt) : 0;
    if (started && now - started > STALE_PROCESSING_MS) {
      job.status = "pending";
      job.startedAt = undefined;
      job.error = "처리 시간 초과 — 다시 대기열에 넣었습니다.";
      changed = true;
    }
  }

  return changed;
}

function hasActiveJobForKeyword(jobs: GenerationJob[], normalizedKey: string): boolean {
  return jobs.some(
    (j) =>
      j.normalizedKeyword === normalizedKey &&
      (j.status === "pending" || j.status === "processing")
  );
}

export async function getGenerationQueueSummary(): Promise<GenerationQueueSummary> {
  const queue = await getGenerationQueue();
  const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };

  for (const job of queue.jobs) {
    counts[job.status]++;
  }

  return {
    ...counts,
    total: queue.jobs.length,
  };
}

export async function enqueueGenerationKeywords(keywords: string[]): Promise<{
  added: number;
  skipped: number;
  skippedReasons: string[];
  jobs: GenerationJob[];
}> {
  const queue = await getGenerationQueue();
  await releaseStaleProcessingJobs(queue);

  const pages = await getPages();
  const existingKeys = new Set(
    pages.map((p) => normalizeKeywordKey(p.keyword))
  );

  const addedJobs: GenerationJob[] = [];
  const skippedReasons: string[] = [];
  let skipped = 0;
  const now = new Date().toISOString();

  for (const raw of keywords) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const normalized = normalizeSeoKeyword(trimmed);
    const key = normalizeKeywordKey(normalized);

    if (existingKeys.has(key)) {
      skipped++;
      skippedReasons.push(`${normalized}: 이미 생성된 페이지`);
      continue;
    }

    if (hasActiveJobForKeyword(queue.jobs, key)) {
      skipped++;
      skippedReasons.push(`${normalized}: 이미 대기열에 있음`);
      continue;
    }

    const job: GenerationJob = {
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      keyword: trimmed,
      normalizedKeyword: key,
      status: "pending",
      requestedAt: now,
    };

    queue.jobs.push(job);
    addedJobs.push(job);
    existingKeys.add(key);
  }

  if (addedJobs.length > 0) {
    queue.updatedAt = now;
    await saveGenerationQueue(queue);
  }

  return { added: addedJobs.length, skipped, skippedReasons, jobs: addedJobs };
}

export async function getPendingGenerationJobsForWorker(): Promise<GenerationJob[]> {
  const queue = await getGenerationQueue();
  if (await releaseStaleProcessingJobs(queue)) {
    queue.updatedAt = new Date().toISOString();
    await saveGenerationQueue(queue);
  }

  return queue.jobs
    .filter((j) => j.status === "pending")
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

export async function processNextGenerationJob(): Promise<{
  ok: boolean;
  status: "created" | "empty" | "quota" | "service" | "duplicate" | "failed";
  message: string;
  job?: GenerationJob;
  page?: { id: string; slug: string; keyword: string; title: string };
  remaining?: number;
  collectionEnqueued?: boolean;
}> {
  const queue = await getGenerationQueue();
  if (await releaseStaleProcessingJobs(queue)) {
    queue.updatedAt = new Date().toISOString();
    await saveGenerationQueue(queue);
  }

  const processing = queue.jobs.find((j) => j.status === "processing");
  if (processing) {
    return {
      ok: false,
      status: "failed",
      message: "다른 키워드 생성이 진행 중입니다. 잠시 후 다시 시도하세요.",
      job: processing,
      remaining: queue.jobs.filter((j) => j.status === "pending").length,
    };
  }

  const next = queue.jobs
    .filter((j) => j.status === "pending")
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))[0];

  if (!next) {
    return {
      ok: true,
      status: "empty",
      message: "대기 중인 키워드가 없습니다.",
      remaining: 0,
    };
  }

  const now = new Date().toISOString();
  next.status = "processing";
  next.startedAt = now;
  next.error = undefined;
  queue.updatedAt = now;
  await saveGenerationQueue(queue);

  try {
    const { page, collectionEnqueued } = await createSeoPageFromKeyword(next.keyword);
    next.status = "completed";
    next.completedAt = new Date().toISOString();
    next.pageId = page.id;
    next.slug = page.slug;
    queue.updatedAt = next.completedAt;
    await saveGenerationQueue(queue);

    const remaining = queue.jobs.filter((j) => j.status === "pending").length;
    return {
      ok: true,
      status: "created",
      message: `SEO 페이지 생성 완료: ${page.keyword}`,
      job: next,
      page: {
        id: page.id,
        slug: page.slug,
        keyword: page.keyword,
        title: page.title,
      },
      remaining,
      collectionEnqueued,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    next.completedAt = completedAt;

    if (error instanceof SeoCreateError) {
      if (error.code === "QUOTA") {
        next.status = "pending";
        next.startedAt = undefined;
        queue.updatedAt = completedAt;
        await saveGenerationQueue(queue);
        return {
          ok: false,
          status: "quota",
          message: error.message,
          job: next,
          remaining: queue.jobs.filter((j) => j.status === "pending").length,
        };
      }

      if (error.code === "SERVICE") {
        next.status = "failed";
        next.error = error.message;
        queue.updatedAt = completedAt;
        await saveGenerationQueue(queue);
        return {
          ok: false,
          status: "service",
          message: error.message,
          job: next,
          remaining: queue.jobs.filter((j) => j.status === "pending").length,
        };
      }

      if (error.code === "DUPLICATE") {
        next.status = "failed";
        next.error = error.message;
      } else {
        next.status = "failed";
        next.error = error.message;
      }
    } else {
      next.status = "failed";
      next.error =
        error instanceof Error ? error.message : "알 수 없는 오류로 생성에 실패했습니다.";
    }

    queue.updatedAt = completedAt;
    await saveGenerationQueue(queue);

    return {
      ok: false,
      status: "failed",
      message: next.error || "생성 실패",
      job: next,
      remaining: queue.jobs.filter((j) => j.status === "pending").length,
    };
  }
}

export async function getRecentGenerationJobs(limit = 30): Promise<GenerationJob[]> {
  const queue = await getGenerationQueue();
  return [...queue.jobs]
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .slice(0, limit);
}
