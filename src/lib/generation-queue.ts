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
import { getSeoQuotaWorkerInfo, getSeoQuotaWorkerInfoForTenant, type SeoQuotaWorkerInfo } from "./seo-quota";
import { getResolvedSiteConfig } from "@/utils/siteConfig";
import { getTenantPages } from "@/lib/supabase/tenant-pages";
import {
  clearTenantPendingJobs,
  loadTenantGenerationQueue,
  saveTenantGenerationJob,
} from "@/lib/supabase/tenant-generation-queue";

export type { GenerationJob, GenerationJobStatus, SeoQuotaWorkerInfo };
export { verifyWorkerRequest };

export interface QueueScopeInfo {
  isTenant: boolean;
  siteConfigId: string | null;
  subdomain: string | null;
}

export interface GenerationWorkerResponse {
  ok: boolean;
  status: "created" | "empty" | "quota" | "service" | "duplicate" | "failed" | "busy";
  message: string;
  job?: GenerationJob;
  page?: { id: string; slug: string; keyword: string; title: string };
  remaining?: number;
  collectionEnqueued?: boolean;
  quota?: SeoQuotaWorkerInfo;
  retryAfterSec?: number;
  nextEligibleAt?: string;
  shouldPause?: boolean;
  tenant?: QueueScopeInfo;
}

type QueueScope =
  | { type: "legacy" }
  | { type: "tenant"; siteConfigId: string; subdomain: string };

async function resolveQueueScope(): Promise<QueueScope> {
  const { tenant, isTenant } = await getResolvedSiteConfig();
  if (isTenant && tenant) {
    return { type: "tenant", siteConfigId: tenant.id, subdomain: tenant.subdomain };
  }
  return { type: "legacy" };
}

export function scopeToInfo(scope: QueueScope): QueueScopeInfo {
  if (scope.type === "tenant") {
    return {
      isTenant: true,
      siteConfigId: scope.siteConfigId,
      subdomain: scope.subdomain,
    };
  }
  return { isTenant: false, siteConfigId: null, subdomain: null };
}

async function loadQueue(scope: QueueScope): Promise<GenerationQueueData> {
  if (scope.type === "legacy") {
    return getGenerationQueue();
  }
  return loadTenantGenerationQueue(scope.siteConfigId);
}

async function saveQueue(scope: QueueScope, queue: GenerationQueueData): Promise<void> {
  if (scope.type === "legacy") {
    await saveGenerationQueue(queue);
    return;
  }
  queue.updatedAt = new Date().toISOString();
  for (const job of queue.jobs) {
    await saveTenantGenerationJob(scope.siteConfigId, {
      ...job,
      siteConfigId: scope.siteConfigId,
    });
  }
}

async function getExistingKeywordKeys(scope: QueueScope): Promise<Set<string>> {
  if (scope.type === "legacy") {
    const pages = await getPages();
    return new Set(pages.map((p) => normalizeKeywordKey(p.keyword)));
  }
  const pages = await getTenantPages(scope.siteConfigId);
  return new Set(pages.map((p) => normalizeKeywordKey(p.keyword)));
}

async function getWorkerQuota(
  scope: QueueScope,
  pendingCount: number
): Promise<SeoQuotaWorkerInfo> {
  if (scope.type === "tenant") {
    return getSeoQuotaWorkerInfoForTenant(scope.siteConfigId, pendingCount);
  }
  return getSeoQuotaWorkerInfo(pendingCount);
}

function buildQuotaResponse(
  message: string,
  quota: SeoQuotaWorkerInfo,
  remaining: number,
  scope: QueueScope
): GenerationWorkerResponse {
  return {
    ok: false,
    status: "quota",
    message,
    remaining,
    quota,
    retryAfterSec: quota.retryAfterSec,
    nextEligibleAt: quota.nextEligibleAt,
    shouldPause: quota.shouldPause,
    tenant: scopeToInfo(scope),
  };
}

const STALE_PROCESSING_MS = 2.5 * 60 * 1000;

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

function summarizeQueue(queue: GenerationQueueData): GenerationQueueSummary {
  const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
  for (const job of queue.jobs) {
    counts[job.status]++;
  }
  return { ...counts, total: queue.jobs.length };
}

export async function getQueueScopeInfo(): Promise<QueueScopeInfo> {
  return scopeToInfo(await resolveQueueScope());
}

export async function getGenerationQueueSummary(): Promise<GenerationQueueSummary> {
  const scope = await resolveQueueScope();
  const queue = await loadQueue(scope);
  return summarizeQueue(queue);
}

export async function enqueueGenerationKeywords(keywords: string[]): Promise<{
  added: number;
  skipped: number;
  skippedReasons: string[];
  jobs: GenerationJob[];
  scope: QueueScopeInfo;
}> {
  const scope = await resolveQueueScope();
  const queue = await loadQueue(scope);
  await releaseStaleProcessingJobs(queue);

  const existingKeys = await getExistingKeywordKeys(scope);

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
      siteConfigId: scope.type === "tenant" ? scope.siteConfigId : undefined,
    };

    queue.jobs.push(job);
    addedJobs.push(job);
    existingKeys.add(key);
  }

  if (addedJobs.length > 0) {
    queue.updatedAt = now;
    await saveQueue(scope, queue);
  }

  return {
    added: addedJobs.length,
    skipped,
    skippedReasons,
    jobs: addedJobs,
    scope: scopeToInfo(scope),
  };
}

export async function getPendingGenerationJobsForWorker(): Promise<{
  jobs: GenerationJob[];
  scope: QueueScope;
}> {
  const scope = await resolveQueueScope();
  const queue = await loadQueue(scope);
  if (await releaseStaleProcessingJobs(queue)) {
    queue.updatedAt = new Date().toISOString();
    await saveQueue(scope, queue);
  }

  const jobs = queue.jobs
    .filter((j) => j.status === "pending")
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

  return { jobs, scope };
}

export async function getWorkerGenerationStatus(): Promise<{
  summary: GenerationQueueSummary;
  pendingJobs: GenerationJob[];
  quota: SeoQuotaWorkerInfo;
  scope: QueueScopeInfo;
}> {
  const { jobs: pendingJobs, scope } = await getPendingGenerationJobsForWorker();
  const queue = await loadQueue(scope);
  const [quota] = await Promise.all([getWorkerQuota(scope, pendingJobs.length)]);
  return {
    summary: summarizeQueue(queue),
    pendingJobs,
    quota,
    scope: scopeToInfo(scope),
  };
}

export async function processNextGenerationJob(): Promise<GenerationWorkerResponse> {
  const scope = await resolveQueueScope();
  const scopeInfo = scopeToInfo(scope);
  const queue = await loadQueue(scope);

  if (await releaseStaleProcessingJobs(queue)) {
    queue.updatedAt = new Date().toISOString();
    await saveQueue(scope, queue);
  }

  const processing = queue.jobs.find((j) => j.status === "processing");
  const pendingCount = queue.jobs.filter((j) => j.status === "pending").length;

  if (processing) {
    const quota = await getWorkerQuota(scope, pendingCount);
    return {
      ok: false,
      status: "busy",
      message: "다른 키워드 생성이 진행 중입니다. 잠시 후 다시 시도하세요.",
      job: processing,
      remaining: pendingCount,
      quota,
      tenant: scopeInfo,
    };
  }

  if (pendingCount === 0) {
    const quota = await getWorkerQuota(scope, 0);
    return {
      ok: true,
      status: "empty",
      message: scope.type === "tenant"
        ? `대기 중인 키워드가 없습니다. (${scope.subdomain})`
        : "대기 중인 키워드가 없습니다.",
      remaining: 0,
      quota,
      retryAfterSec: 600,
      shouldPause: false,
      tenant: scopeInfo,
    };
  }

  const quota = await getWorkerQuota(scope, pendingCount);
  if (!quota.canGenerate) {
    const siteLabel = scope.type === "tenant" ? ` [${scope.subdomain}]` : "";
    return buildQuotaResponse(
      `오늘 SEO 페이지 생성 한도${siteLabel}(${quota.limit}개)를 모두 사용했습니다. ${quota.nextEligibleAt} (KST 자정) 이후 VM이 다시 시도하세요.`,
      quota,
      pendingCount,
      scope
    );
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
      quota,
      retryAfterSec: 600,
      tenant: scopeInfo,
    };
  }

  const now = new Date().toISOString();
  next.status = "processing";
  next.startedAt = now;
  next.error = undefined;
  queue.updatedAt = now;
  await saveQueue(scope, queue);

  const createOptions = {
    ...(scope.type === "tenant" ? { siteConfigId: scope.siteConfigId } : {}),
    skipLocalPartners: true,
  };

  try {
    const { page, collectionEnqueued } = await createSeoPageFromKeyword(
      next.keyword,
      createOptions
    );
    next.status = "completed";
    next.completedAt = new Date().toISOString();
    next.pageId = page.id;
    next.slug = page.slug;
    queue.updatedAt = next.completedAt;
    await saveQueue(scope, queue);

    const remaining = queue.jobs.filter((j) => j.status === "pending").length;
    const quotaAfter = await getWorkerQuota(scope, remaining);
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
      quota: quotaAfter,
      shouldPause: quotaAfter.shouldPause,
      retryAfterSec: quotaAfter.canGenerate ? undefined : quotaAfter.retryAfterSec,
      nextEligibleAt: quotaAfter.canGenerate ? undefined : quotaAfter.nextEligibleAt,
      tenant: scopeInfo,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    next.completedAt = completedAt;

    if (error instanceof SeoCreateError) {
      if (error.code === "QUOTA") {
        next.status = "pending";
        next.startedAt = undefined;
        queue.updatedAt = completedAt;
        await saveQueue(scope, queue);
        const quotaBlocked = await getWorkerQuota(
          scope,
          queue.jobs.filter((j) => j.status === "pending").length
        );
        return {
          ...buildQuotaResponse(
            error.message,
            quotaBlocked,
            queue.jobs.filter((j) => j.status === "pending").length,
            scope
          ),
          job: next,
        };
      }

      if (error.code === "SERVICE") {
        next.status = "failed";
        next.error = error.message;
        queue.updatedAt = completedAt;
        await saveQueue(scope, queue);
        return {
          ok: false,
          status: "service",
          message: error.message,
          job: next,
          remaining: queue.jobs.filter((j) => j.status === "pending").length,
          tenant: scopeInfo,
        };
      }

      next.status = "failed";
      next.error = error.message;
    } else {
      next.status = "failed";
      next.error =
        error instanceof Error ? error.message : "알 수 없는 오류로 생성에 실패했습니다.";
    }

    queue.updatedAt = completedAt;
    await saveQueue(scope, queue);

    return {
      ok: false,
      status: "failed",
      message: next.error || "생성 실패",
      job: next,
      remaining: queue.jobs.filter((j) => j.status === "pending").length,
      tenant: scopeInfo,
    };
  }
}

export async function getRecentGenerationJobs(limit = 30): Promise<GenerationJob[]> {
  const scope = await resolveQueueScope();
  const queue = await loadQueue(scope);
  return [...queue.jobs]
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .slice(0, limit);
}

export async function getPendingGenerationKeywords(): Promise<string[]> {
  const { jobs } = await getPendingGenerationJobsForWorker();
  return jobs.map((j) => j.keyword);
}

export async function getPendingGenerationKeywordsText(): Promise<string> {
  const keywords = await getPendingGenerationKeywords();
  return keywords.join("\n");
}

export async function getGenerationJobsForAdmin(
  status: GenerationJobStatus | "all" = "all",
  limit = 5000
): Promise<{ jobs: GenerationJob[]; scope: QueueScopeInfo }> {
  const scope = await resolveQueueScope();
  const queue = await loadQueue(scope);
  const sorted = [...queue.jobs].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const filtered =
    status === "all" ? sorted : sorted.filter((j) => j.status === status);
  return { jobs: filtered.slice(0, limit), scope: scopeToInfo(scope) };
}

export async function replacePendingGenerationKeywords(keywords: string[]): Promise<{
  replaced: number;
  skipped: number;
  skippedReasons: string[];
  scope: QueueScopeInfo;
}> {
  const scope = await resolveQueueScope();
  const queue = await loadQueue(scope);
  await releaseStaleProcessingJobs(queue);

  if (scope.type === "tenant") {
    await clearTenantPendingJobs(scope.siteConfigId);
  }

  queue.jobs = queue.jobs.filter((j) => j.status !== "pending");

  const existingKeys = await getExistingKeywordKeys(scope);

  const skippedReasons: string[] = [];
  let skipped = 0;
  let replaced = 0;
  const now = new Date().toISOString();
  const seenInBatch = new Set<string>();

  for (const raw of keywords) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const normalized = normalizeSeoKeyword(trimmed);
    const key = normalizeKeywordKey(normalized);

    if (seenInBatch.has(key)) {
      skipped++;
      skippedReasons.push(`${normalized}: 목록 내 중복`);
      continue;
    }
    seenInBatch.add(key);

    if (existingKeys.has(key)) {
      skipped++;
      skippedReasons.push(`${normalized}: 이미 생성된 페이지`);
      continue;
    }

    if (hasActiveJobForKeyword(queue.jobs, key)) {
      skipped++;
      skippedReasons.push(`${normalized}: 생성 중인 작업과 중복`);
      continue;
    }

    queue.jobs.push({
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      keyword: trimmed,
      normalizedKeyword: key,
      status: "pending",
      requestedAt: now,
      siteConfigId: scope.type === "tenant" ? scope.siteConfigId : undefined,
    });
    replaced++;
    existingKeys.add(key);
  }

  queue.updatedAt = now;
  await saveQueue(scope, queue);

  return { replaced, skipped, skippedReasons, scope: scopeToInfo(scope) };
}
