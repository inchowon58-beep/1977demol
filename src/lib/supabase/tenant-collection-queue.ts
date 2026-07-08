import type { CollectionJob, CollectionJobStatus } from "@/lib/data";
import { getSupabaseAdmin } from "./tenant-db";

interface TenantCollectionRow {
  id: string;
  site_config_id: string;
  site_url: string;
  page_url: string;
  page_id: string;
  keyword: string;
  slug: string;
  status: CollectionJobStatus;
  requested_at: string;
  submitted_at: string | null;
  error: string | null;
}

function rowToJob(row: TenantCollectionRow): CollectionJob {
  return {
    id: row.id,
    siteUrl: row.site_url,
    pageUrl: row.page_url,
    pageId: row.page_id,
    keyword: row.keyword,
    slug: row.slug,
    status: row.status,
    requestedAt: row.requested_at,
    submittedAt: row.submitted_at || undefined,
    error: row.error || undefined,
    siteConfigId: row.site_config_id,
  };
}

export async function getTenantCollectionJobs(
  siteConfigId: string
): Promise<CollectionJob[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tenant_collection_jobs")
    .select("*")
    .eq("site_config_id", siteConfigId)
    .order("requested_at", { ascending: false });

  if (error || !data) return [];
  return (data as TenantCollectionRow[]).map(rowToJob);
}

export async function saveTenantCollectionJob(
  siteConfigId: string,
  job: CollectionJob
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");

  const row = {
    id: job.id,
    site_config_id: siteConfigId,
    site_url: job.siteUrl,
    page_url: job.pageUrl,
    page_id: job.pageId,
    keyword: job.keyword,
    slug: job.slug,
    status: job.status,
    requested_at: job.requestedAt,
    submitted_at: job.submittedAt || null,
    error: job.error || null,
  };

  const { error } = await supabase.from("tenant_collection_jobs").upsert(row);
  if (error) throw new Error(error.message);
}

export async function deleteTenantCollectionJobsForPage(
  siteConfigId: string,
  pageId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from("tenant_collection_jobs")
    .delete()
    .eq("site_config_id", siteConfigId)
    .eq("page_id", pageId);
}

export async function findTenantCollectionJobById(
  jobId: string
): Promise<{ siteConfigId: string; job: CollectionJob } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tenant_collection_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as TenantCollectionRow;
  return { siteConfigId: row.site_config_id, job: rowToJob(row) };
}
