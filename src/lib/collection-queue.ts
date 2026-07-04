import {
  getCollectionQueue,
  saveCollectionQueue,
  type CollectionJob,
  type CollectionJobStatus,
  type CollectionQueueData,
  type SeoPage,
} from "./data";
import { getSettings } from "./data";
import { getSiteConfig } from "./site-config";
import { guidePageUrl } from "./constants";
import { getSiteUrl } from "./site-url";

export type { CollectionJob, CollectionJobStatus };

export interface CollectionPageStatus {
  pageId: string;
  status: CollectionJobStatus | null;
  pageUrl: string;
  requestedAt: string | null;
  submittedAt: string | null;
  error: string | null;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").trim();
}

export async function getCollectionSiteUrl(): Promise<string> {
  const [settings, config] = await Promise.all([getSettings(), getSiteConfig()]);
  const fromSettings = settings.collectionSiteUrl?.trim();
  if (fromSettings) return normalizeUrl(fromSettings);
  return normalizeUrl(getSiteUrl(config));
}

export function buildPageAbsoluteUrl(siteUrl: string, slug: string): string {
  return `${normalizeUrl(siteUrl)}${guidePageUrl(slug)}`;
}

function latestJobForPage(jobs: CollectionJob[], pageId: string): CollectionJob | undefined {
  return jobs
    .filter((j) => j.pageId === pageId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
}

function hasPendingForPage(jobs: CollectionJob[], pageId: string): boolean {
  return jobs.some((j) => j.pageId === pageId && j.status === "pending");
}

/** 페이지당 pending 1건만 유지 — 오래된 중복 pending 제거 */
function dedupePendingJobsInQueue(jobs: CollectionJob[]): {
  jobs: CollectionJob[];
  removed: number;
} {
  const pendingByPage = new Map<string, CollectionJob[]>();

  for (const job of jobs) {
    if (job.status !== "pending") continue;
    const list = pendingByPage.get(job.pageId) || [];
    list.push(job);
    pendingByPage.set(job.pageId, list);
  }

  const removeIds = new Set<string>();

  for (const pendings of pendingByPage.values()) {
    if (pendings.length <= 1) continue;
    pendings.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    for (const duplicate of pendings.slice(1)) {
      removeIds.add(duplicate.id);
    }
  }

  if (removeIds.size === 0) {
    return { jobs, removed: 0 };
  }

  return {
    jobs: jobs.filter((j) => !removeIds.has(j.id)),
    removed: removeIds.size,
  };
}

async function loadNormalizedQueue(): Promise<CollectionQueueData> {
  const queue = await getCollectionQueue();
  const { jobs, removed } = dedupePendingJobsInQueue(queue.jobs);
  if (removed === 0) return queue;

  queue.jobs = jobs;
  queue.updatedAt = new Date().toISOString();
  await saveCollectionQueue(queue);
  return queue;
}

/** VM에 내려줄 pending — 페이지·URL당 최신 1건만 */
function uniquePendingJobsForWorker(jobs: CollectionJob[]): CollectionJob[] {
  const byPageId = new Map<string, CollectionJob>();
  for (const job of jobs) {
    const existing = byPageId.get(job.pageId);
    if (!existing || job.requestedAt > existing.requestedAt) {
      byPageId.set(job.pageId, job);
    }
  }

  const byPageUrl = new Map<string, CollectionJob>();
  for (const job of byPageId.values()) {
    const url = normalizeUrl(job.pageUrl);
    const existing = byPageUrl.get(url);
    if (!existing || job.requestedAt > existing.requestedAt) {
      byPageUrl.set(url, job);
    }
  }

  return Array.from(byPageUrl.values()).sort((a, b) =>
    a.requestedAt.localeCompare(b.requestedAt)
  );
}

export async function getCollectionStatusMap(): Promise<Map<string, CollectionPageStatus>> {
  const queue = await getCollectionQueue();
  const siteUrl = await getCollectionSiteUrl();
  const map = new Map<string, CollectionPageStatus>();

  for (const job of queue.jobs) {
    const existing = map.get(job.pageId);
    if (!existing || (job.requestedAt > (existing.requestedAt || ""))) {
      map.set(job.pageId, {
        pageId: job.pageId,
        status: job.status,
        pageUrl: job.pageUrl,
        requestedAt: job.requestedAt,
        submittedAt: job.submittedAt || null,
        error: job.error || null,
      });
    }
  }

  return map;
}

export async function enqueueCollectionRequest(
  pageId: string,
  knownPage?: SeoPage
): Promise<{
  ok: boolean;
  message: string;
  job?: CollectionJob;
}> {
  let page = knownPage;
  if (!page) {
    const { getPages } = await import("./data");
    const pages = await getPages();
    page = pages.find((p) => p.id === pageId);
  }
  if (!page || page.id !== pageId) {
    return { ok: false, message: "페이지를 찾을 수 없습니다." };
  }

  const siteUrl = await getCollectionSiteUrl();
  const pageUrl = buildPageAbsoluteUrl(siteUrl, page.slug);
  const queue = await loadNormalizedQueue();
  const latest = latestJobForPage(queue.jobs, pageId);

  if (hasPendingForPage(queue.jobs, pageId)) {
    return { ok: false, message: "이미 대기 중인 URL입니다." };
  }

  if (latest?.status === "submitted") {
    return { ok: false, message: "이미 수집요청 완료된 URL입니다." };
  }

  const now = new Date().toISOString();
  const job: CollectionJob = {
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    siteUrl,
    pageUrl,
    pageId: page.id,
    keyword: page.keyword,
    slug: page.slug,
    status: "pending",
    requestedAt: now,
  };

  queue.jobs.push(job);
  queue.updatedAt = now;
  await saveCollectionQueue(queue);

  return { ok: true, message: "순위반영(수집) 대기열에 등록했습니다. VM 프로그램이 가져가 처리합니다.", job };
}

export async function enqueueAllPendingPages(): Promise<{
  added: number;
  skipped: number;
}> {
  const { getPages } = await import("./data");
  const pages = await getPages();
  let added = 0;
  let skipped = 0;

  for (const page of pages) {
    const result = await enqueueCollectionRequest(page.id);
    if (result.ok) added++;
    else skipped++;
  }

  return { added, skipped };
}

export async function getPendingJobsForWorker(siteUrl: string): Promise<CollectionJob[]> {
  const normalized = normalizeUrl(siteUrl);
  const queue = await loadNormalizedQueue();
  const pending = queue.jobs.filter(
    (j) => normalizeUrl(j.siteUrl) === normalized && j.status === "pending"
  );
  return uniquePendingJobsForWorker(pending);
}

export async function reportCollectionResults(
  results: { id: string; status: "submitted" | "failed"; error?: string }[]
): Promise<number> {
  const queue = await getCollectionQueue();
  const now = new Date().toISOString();
  let updated = 0;

  for (const result of results) {
    const job = queue.jobs.find((j) => j.id === result.id);
    if (!job || job.status !== "pending") continue;
    job.status = result.status;
    job.submittedAt = now;
    if (result.error) job.error = result.error;
    updated++;
  }

  if (updated > 0) {
    queue.updatedAt = now;
    await saveCollectionQueue(queue);
  }

  return updated;
}

export async function removeCollectionJobsForPage(pageId: string): Promise<void> {
  const queue = await getCollectionQueue();
  const next = queue.jobs.filter((j) => j.pageId !== pageId);
  if (next.length === queue.jobs.length) return;
  queue.jobs = next;
  queue.updatedAt = new Date().toISOString();
  await saveCollectionQueue(queue);
}

export function getWorkerSecretFromEnv(): string {
  return process.env.COLLECTION_WORKER_SECRET?.trim() || "";
}

export async function getWorkerSecret(): Promise<string> {
  const settings = await getSettings();
  return settings.collectionWorkerSecret?.trim() || getWorkerSecretFromEnv();
}

export async function verifyWorkerRequest(request: Request): Promise<boolean> {
  const secret = await getWorkerSecret();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
