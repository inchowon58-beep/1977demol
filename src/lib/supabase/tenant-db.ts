import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TenantSiteConfigRow } from "@/types/tenant";

let adminClient: SupabaseClient | null = null;

function sanitizeEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

/** https://xxx.supabase.co 형식으로 정규화 */
export function normalizeSupabaseUrl(raw: string): string {
  let url = sanitizeEnv(raw);
  url = url.replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  return url;
}

export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const key = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return !!(url && key);
}

export function getSupabaseConfigError(): string | null {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const key = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !key) {
    return "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 Vercel 환경변수에 없습니다.";
  }
  if (!url.startsWith("https://") || !url.includes("supabase.co")) {
    return "SUPABASE_URL 형식이 올바르지 않습니다. 예: https://xxxx.supabase.co (끝에 /rest/v1 제외)";
  }
  if (key.startsWith("sb_publishable_") || key.includes("anon")) {
    return "SUPABASE_SERVICE_ROLE_KEY에 service_role 키를 넣어야 합니다. (anon 키 X)";
  }
  return null;
}

/** API Route 전용 — service role */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!adminClient) {
    adminClient = createClient(
      normalizeSupabaseUrl(process.env.SUPABASE_URL!),
      sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }

  return adminClient;
}

export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return "";
  let first = host.split(",")[0].trim().toLowerCase();
  first = first.replace(/^https?:\/\//, "");
  first = first.replace(/^www\./, "");
  return first.split(":")[0].replace(/\/+$/, "");
}

export async function fetchTenantByHostname(
  hostname: string
): Promise<TenantSiteConfigRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !hostname) return null;

  const normalized = normalizeHostname(hostname);

  const { data, error } = await supabase
    .from("site_configs")
    .select("*")
    .eq("subdomain", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return data as TenantSiteConfigRow;
}

export async function fetchTenantById(
  siteConfigId: string
): Promise<TenantSiteConfigRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !siteConfigId) return null;

  const { data, error } = await supabase
    .from("site_configs")
    .select("*")
    .eq("id", siteConfigId)
    .maybeSingle();

  if (error || !data) return null;
  return data as TenantSiteConfigRow;
}

export async function insertTenantSiteConfig(
  row: Omit<TenantSiteConfigRow, "id" | "created_at">
): Promise<TenantSiteConfigRow> {
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("site_configs")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("Invalid path") || error.code === "PGRST125") {
      throw new Error(
        `Supabase URL 오류: SUPABASE_URL이 https://프로젝트ID.supabase.co 인지 확인하세요. (${error.message})`
      );
    }
    throw new Error(`Supabase 저장 실패: ${error.message}`);
  }

  return data as TenantSiteConfigRow;
}

export async function listAllTenants(): Promise<TenantSiteConfigRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("site_configs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase 조회 실패: ${error.message}`);
  }

  return (data || []) as TenantSiteConfigRow[];
}

export async function updateTenantSiteConfig(
  id: string,
  patch: Partial<Omit<TenantSiteConfigRow, "id" | "created_at">>
): Promise<TenantSiteConfigRow> {
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("site_configs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Supabase 저장 실패: ${error.message}`);
  }

  return data as TenantSiteConfigRow;
}

export async function isSubdomainTaken(subdomain: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(getSupabaseConfigError() || "Supabase가 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("site_configs")
    .select("id")
    .eq("subdomain", normalizeHostname(subdomain))
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase 조회 실패: ${error.message}`);
  }

  return !!data;
}
