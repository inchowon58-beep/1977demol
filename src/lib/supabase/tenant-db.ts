import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TenantSiteConfigRow } from "@/types/tenant";

let adminClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/** API Route 전용 — service role (RLS 우회) */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!adminClient) {
    adminClient = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
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

export async function insertTenantSiteConfig(
  row: Omit<TenantSiteConfigRow, "id" | "created_at">
): Promise<TenantSiteConfigRow> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase가 설정되지 않았습니다. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인하세요.");
  }

  const { data, error } = await supabase
    .from("site_configs")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as TenantSiteConfigRow;
}

export async function isSubdomainTaken(subdomain: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data } = await supabase
    .from("site_configs")
    .select("id")
    .eq("subdomain", normalizeHostname(subdomain))
    .maybeSingle();

  return !!data;
}
