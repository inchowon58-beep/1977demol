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
import { getResolvedSiteConfig, getResolvedSiteConfigForTenant } from "@/utils/siteConfig";
import { fetchTenantByHostname } from "@/lib/supabase/tenant-db";
import {
  deleteTenantCollectionJobsForPage,
  findTenantCollectionJobById,
  getTenantCollectionJobs,
  saveTenantCollectionJob,
} from "@/lib/supabase/tenant-collection-queue";

export type { CollectionJob, CollectionJobStatus };

export interface CollectionPageStatus {
  pageId: string;
  status: CollectionJobStatus | null;
  pageUrl: string;
  requestedAt: string | null;
  submittedAt: string | null;
  error: string | null;
}

type CollectionScope =
  | { type: "legacy"; siteUrl: string }
  | { type: "tenant"; siteConfigId: string; subdomain: string; siteUrl: string };

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").trim();
}

function hostnameFromSiteUrl(siteUrl: string): string {
  const raw = siteUrl.trim();
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

function tenantSiteUrl(subdomain: string): string {
  const proto = subdomain.includes("localhost") ? "http" : "https";
  return normalizeUrl(`${proto}://${subdomain}`);
}

async function resolveScopeFromSiteUrl(siteUrl: string): Promise<CollectionScope> {
  const normalized = normalizeUrl(siteUrl);
  const hostname = hostnameFromSiteUrl(normalized);
  const tenant = await fetchTenantByHostname(hostname);

  if (tenant) {
    return {
      type: "tenant",
      siteConfigId: tenant.id,
      subdomain: tenant.subdomain,
      siteUrl: tenantSiteUrl(tenant.subdomain),
    };
  }

  return { type: "legacy", siteUrl: normalized };
}

async function resolveScopeForRequest(
  siteConfigId?: string
): Promise<CollectionScope> {
  if (siteConfigId) {
    const resolved = await getResolvedSiteConfigForTenant(siteConfigId);
    if (resolved?.tenant) {
      return {
        type: "tenant",
        siteConfigId: resolved.tenant.id,
        subdomain: resolved.tenant.subdomain,
        siteUrl: normalizeUrl(resolved.config.url),
      };
    }
  }

  const { tenant, isTenant, config } = await getResolvedSiteConfig();
  if (isTenant && tenant) {
    return {
      type: "tenant",
      siteConfigId: tenant.id,
      subdomain: tenant.subdomain,
      siteUrl: normalizeUrl(config.url),
    };
  }

  return { type: "legacy", siteUrl: await getLegacyCollectionSiteUrl() };
}

async function getLegacyCollectionSiteUrl(): Promise<string> {
  const [settings, config] = await Promise.all([getSettings(), getSiteConfig()]);
  const fromSettings = settings.collectionSiteUrl?.trim();
  if (fromSettings) return normalizeUrl(fromSettings);
  return normalizeUrl(getSiteUrl(config));
}

export async function getCollectionSiteUrl(siteConfigId?: string): Promise<string> {
  const scope = await resolveScopeForRequest(siteConfigId);
  return scope.siteUrl;
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

async function loadLegacyQueue(): Promise<CollectionQueueData> {
  const queue = await getCollectionQueue();
  const { jobs, removed } = dedupePendingJobsInQueue(queue.jobs);
  if (removed === 0) return queue;

  queue.jobs = jobs;
  queue.updatedAt = new Date().toISOString();
  await saveCollectionQueue(queue);
  return queue;
}

async function loadJobsForScope(scope: CollectionScope): Promise<CollectionJob[]> {
  if (scope.type === "tenant") {
    return getTenantCollectionJobs(scope.siteConfigId);
  }
  const queue = await loadLegacyQueue();
  return queue.jobs;
}

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

/** 레거시 큐에 잘못된 siteUrl로 들어간 테넌트 job 보정 (pageUrl 호스트 기준) */
async function legacyJobsForTenantSite(siteUrl: string): Promise<CollectionJob[]> {
  const hostname = hostnameFromSiteUrl(siteUrl);
  const queue = await loadLegacyQueue();
  return queue.jobs.filter((job) => {
    if (job.status !== "pending") return false;
    return hostnameFromSiteUrl(job.pageUrl) === hostname;
  });
}

export async function getCollectionStatusMap(
  siteConfigId?: string
): Promise<Map<string, CollectionPageStatus>> {
  const scope = await resolveScopeForRequest(siteConfigId);
  const jobs = await loadJobsForScope(scope);
  const map = new Map<string, CollectionPageStatus>();

  for (const job of jobs) {
    const existing = map.get(job.pageId);
    if (!existing || job.requestedAt > (existing.requestedAt || "")) {
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
  knownPage?: SeoPage,
  options?: { siteConfigId?: string }
): Promise<{
  ok: boolean;
  message: string;
  job?: CollectionJob;
}> {
  const scope = await resolveScopeForRequest(options?.siteConfigId);

  let page = knownPage;
  if (!page) {
    if (scope.type === "tenant") {
      const { getTenantPages } = await import("@/lib/supabase/tenant-pages");
      const pages = await getTenantPages(scope.siteConfigId);
      page = pages.find((p) => p.id === pageId);
    } else {
      const { getPages } = await import("./data");
      const pages = await getPages();
      page = pages.find((p) => p.id === pageId);
    }
  }
  if (!page || page.id !== pageId) {
    return { ok: false, message: "페이지를 찾을 수 없습니다." };
  }

  const siteUrl = scope.siteUrl;
  const pageUrl = buildPageAbsoluteUrl(siteUrl, page.slug);
  const jobs = await loadJobsForScope(scope);
  const latest = latestJobForPage(jobs, pageId);

  if (hasPendingForPage(jobs, pageId)) {
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
    siteConfigId: scope.type === "tenant" ? scope.siteConfigId : undefined,
  };

  if (scope.type === "tenant") {
    await saveTenantCollectionJob(scope.siteConfigId, job);
  } else {
    const queue = await loadLegacyQueue();
    queue.jobs.push(job);
    queue.updatedAt = now;
    await saveCollectionQueue(queue);
  }

  return {
    ok: true,
    message: "순위반영(수집) 대기열에 등록했습니다. VM 프로그램이 가져가 처리합니다.",
    job,
  };
}

export async function enqueueAllPendingPages(
  siteConfigId?: string
): Promise<{ added: number; skipped: number }> {
  const scope = await resolveScopeForRequest(siteConfigId);
  let pages: SeoPage[];

  if (scope.type === "tenant") {
    const { getTenantPages } = await import("@/lib/supabase/tenant-pages");
    pages = await getTenantPages(scope.siteConfigId);
  } else {
    const { getPages } = await import("./data");
    pages = await getPages();
  }

  let added = 0;
  let skipped = 0;

  for (const page of pages) {
    const result = await enqueueCollectionRequest(page.id, page, {
      siteConfigId: scope.type === "tenant" ? scope.siteConfigId : undefined,
    });
    if (result.ok) added++;
    else skipped++;
  }

  return { added, skipped };
}

export async function getPendingJobsForWorker(siteUrl: string): Promise<CollectionJob[]> {
  const scope = await resolveScopeFromSiteUrl(siteUrl);
  const normalized = normalizeUrl(siteUrl);

  if (scope.type === "tenant") {
    const tenantPending = (await loadJobsForScope(scope)).filter(
      (j) => normalizeUrl(j.siteUrl) === normalized && j.status === "pending"
    );
    const legacyPending = await legacyJobsForTenantSite(normalized);
    const merged = uniquePendingJobsForWorker([...tenantPending, ...legacyPending]);
    return merged;
  }

  const pending = (await loadJobsForScope(scope)).filter(
    (j) => normalizeUrl(j.siteUrl) === normalized && j.status === "pending"
  );
  return uniquePendingJobsForWorker(pending);
}

export async function reportCollectionResults(
  results: { id: string; status: "submitted" | "failed"; error?: string }[]
): Promise<number> {
  const now = new Date().toISOString();
  let updated = 0;

  const legacyQueue = await getCollectionQueue();
  let legacyDirty = false;

  for (const result of results) {
    const legacyJob = legacyQueue.jobs.find((j) => j.id === result.id);
    if (legacyJob && legacyJob.status === "pending") {
      legacyJob.status = result.status;
      legacyJob.submittedAt = now;
      if (result.error) legacyJob.error = result.error;
      legacyDirty = true;
      updated++;
      continue;
    }

    const tenantHit = await findTenantCollectionJobById(result.id);
    if (tenantHit && tenantHit.job.status === "pending") {
      const next: CollectionJob = {
        ...tenantHit.job,
        status: result.status,
        submittedAt: now,
        error: result.error || tenantHit.job.error,
      };
      await saveTenantCollectionJob(tenantHit.siteConfigId, next);
      updated++;
    }
  }

  if (legacyDirty) {
    legacyQueue.updatedAt = now;
    await saveCollectionQueue(legacyQueue);
  }

  return updated;
}

export async function removeCollectionJobsForPage(
  pageId: string,
  siteConfigId?: string
): Promise<void> {
  const scope = await resolveScopeForRequest(siteConfigId);

  if (scope.type === "tenant") {
    await deleteTenantCollectionJobsForPage(scope.siteConfigId, pageId);
    return;
  }

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
