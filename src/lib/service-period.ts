import { getSettings, saveSettings } from "./data";
import { DEFAULT_SITE_CONFIG } from "./site-config-types";

export interface ServicePeriodStatus {
  daysRemaining: number;
  expiresAt: string | null;
  active: boolean;
  expired: boolean;
}

export function todayKst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function parseKstDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+09:00`);
}

/** 오늘 포함 N일 → 만료일 (YYYY-MM-DD, KST) */
export function computeExpiresAtFromDays(days: number): string {
  const n = Math.max(0, days);
  if (n === 0) return todayKst();
  const base = parseKstDate(todayKst());
  base.setDate(base.getDate() + n - 1);
  return base.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function daysRemainingFromExpiresAt(expiresAt: string | undefined): number {
  if (!expiresAt) return 0;
  const today = todayKst();
  const exp = expiresAt.slice(0, 10);
  if (exp < today) return 0;
  const start = parseKstDate(today).getTime();
  const end = parseKstDate(exp).getTime();
  return Math.floor((end - start) / 86400000) + 1;
}

export async function getServicePeriodStatus(): Promise<ServicePeriodStatus> {
  const settings = await getSettings();
  let expiresAt = settings.serviceExpiresAt?.slice(0, 10) || null;

  if (!expiresAt && settings.serviceAvailableDays && settings.serviceAvailableDays > 0) {
    expiresAt = computeExpiresAtFromDays(settings.serviceAvailableDays);
  }

  const daysRemaining = expiresAt ? daysRemainingFromExpiresAt(expiresAt) : 0;
  const active = daysRemaining > 0;

  return {
    daysRemaining,
    expiresAt,
    active,
    expired: !!expiresAt && !active,
  };
}
export async function applyServiceAvailableDays(days: number): Promise<string> {
  const expiresAt = computeExpiresAtFromDays(days);
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    serviceAvailableDays: Math.max(0, days),
    serviceExpiresAt: expiresAt,
  });
  return expiresAt;
}

export function getConfiguredServiceDays(settings: Record<string, unknown>): number {
  const merged = { ...DEFAULT_SITE_CONFIG, ...settings };
  if (merged.serviceAvailableDays != null) {
    return Math.max(0, Number(merged.serviceAvailableDays) || 0);
  }
  const remaining = daysRemainingFromExpiresAt(
    (settings.serviceExpiresAt as string) || undefined
  );
  return remaining;
}
