import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import {
  getSupabaseConfigError,
  insertTenantSiteConfig,
  isSubdomainTaken,
  isSupabaseConfigured,
  normalizeHostname,
  normalizeSupabaseUrl,
} from "@/lib/supabase/tenant-db";
import { pickThemeColor } from "@/lib/tenant-theme";
import { pickTenantContentPackage } from "@/lib/tenant-content";
import { getSettings } from "@/lib/data";
import { resolveDailySeoLimit } from "@/lib/seo-quota";
import { fetchNaverAccountById } from "@/lib/supabase/naver-accounts";
import { enqueueNaverSiteRegistration } from "@/lib/naver-register-worker";
import { parseSiteDesignId, siteDesignLabel } from "@/lib/site-designs";
import type { CreateSiteInput, TenantContentData } from "@/types/tenant";

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function sanitizeEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

type VercelEnv = { token: string; projectRef: string; teamId?: string };

function getVercelEnv(): VercelEnv | { error: string } {
  const token = sanitizeEnv(process.env.VERCEL_TOKEN);
  const projectRef =
    sanitizeEnv(process.env.VERCEL_PROJECT_ID) ||
    sanitizeEnv(process.env.VERCEL_PROJECT_NAME);
  const teamId = sanitizeEnv(process.env.VERCEL_TEAM_ID);

  if (!token || !projectRef) {
    return {
      error:
        "VERCEL_TOKEN 또는 VERCEL_PROJECT_ID가 없습니다. (프로젝트 이름도 가능: VERCEL_PROJECT_NAME)",
    };
  }

  if (projectRef.includes("/") || projectRef.startsWith("http")) {
    return {
      error:
        "VERCEL_PROJECT_ID는 prj_xxx 또는 프로젝트 이름(예: 1977demol)만 입력하세요. URL 전체는 안 됩니다.",
    };
  }

  if (teamId && !teamId.startsWith("team_")) {
    return {
      error: "VERCEL_TEAM_ID는 team_로 시작해야 합니다. 개인 계정이면 비우세요.",
    };
  }

  return { token, projectRef, teamId: teamId || undefined };
}

function buildVercelApiUrl(path: string, env: VercelEnv, teamId?: string): URL {
  const url = new URL(`https://api.vercel.com${path}`);
  const tid = teamId ?? env.teamId;
  if (tid) url.searchParams.set("teamId", tid);
  return url;
}

async function vercelJson<T>(
  url: URL,
  token: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}

function vercelErrorMessage(body: unknown, status: number): string {
  const b = body as { error?: { message?: string }; message?: string };
  return b.error?.message || b.message || `Vercel API 실패 (HTTP ${status})`;
}

async function fetchProjectDomain(
  domain: string,
  env: VercelEnv,
  teamId?: string
): Promise<{ name: string; verified?: boolean } | null> {
  const url = buildVercelApiUrl(
    `/v9/projects/${encodeURIComponent(env.projectRef)}/domains/${encodeURIComponent(domain)}`,
    env,
    teamId
  );

  const { ok, body } = await vercelJson<{ name?: string; verified?: boolean }>(url, env.token);
  if (!ok) return null;

  return {
    name: body.name || domain,
    verified: body.verified,
  };
}

async function registerVercelDomain(domain: string): Promise<{
  ok: boolean;
  data?: { name: string; verified?: boolean; alreadyLinked?: boolean };
  error?: string;
}> {
  const env = getVercelEnv();
  if ("error" in env) {
    return { ok: false, error: env.error };
  }

  const teamAttempts: (string | undefined)[] = env.teamId
    ? [env.teamId, undefined]
    : [undefined];

  for (const teamId of teamAttempts) {
    const existing = await fetchProjectDomain(domain, env, teamId);
    if (existing) {
      return { ok: true, data: { ...existing, alreadyLinked: true } };
    }

    const url = buildVercelApiUrl(
      `/v10/projects/${encodeURIComponent(env.projectRef)}/domains`,
      env,
      teamId
    );

    const { ok, status, body } = await vercelJson<{
      name?: string;
      verified?: boolean;
      error?: { message?: string };
      message?: string;
    }>(url, env.token, {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    });

    if (ok) {
      return {
        ok: true,
        data: {
          name: body.name || domain,
          verified: body.verified,
        },
      };
    }

    const raw = vercelErrorMessage(body, status);
    const lower = raw.toLowerCase();

    if (lower.includes("already") && lower.includes("project")) {
      const onProject = await fetchProjectDomain(domain, env, teamId);
      if (onProject) {
        return { ok: true, data: { ...onProject, alreadyLinked: true } };
      }
      return {
        ok: false,
        error:
          `${domain} 은(는) 다른 Vercel 프로젝트에 연결되어 있습니다. ` +
          "Vercel Domains에서 해제 후 다시 시도하세요.",
      };
    }

    const isInvalidPath = lower.includes("invalid path");
    if (isInvalidPath && teamId && teamAttempts.length > 1) {
      continue;
    }

    if (isInvalidPath) {
      return {
        ok: false,
        error:
          `${raw} — VERCEL_PROJECT_ID(또는 VERCEL_PROJECT_NAME)와 VERCEL_TEAM_ID를 확인하세요. ` +
          "개인 계정이면 VERCEL_TEAM_ID를 삭제하고, prj_로 시작하는 Project ID를 사용하세요.",
      };
    }

    return { ok: false, error: raw };
  }

  return { ok: false, error: "Vercel 도메인 등록에 실패했습니다." };
}

/** 마스터용 — Supabase·Vercel 환경변수 연결 상태 확인 */
export async function GET() {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "마스터 권한이 필요합니다." }, { status: 401 });
  }

  const supabaseError = getSupabaseConfigError();
  const vercel = getVercelEnv();

  return NextResponse.json({
    supabase: {
      configured: isSupabaseConfigured() && !supabaseError,
      error: supabaseError,
      urlHost: process.env.SUPABASE_URL
        ? normalizeSupabaseUrl(process.env.SUPABASE_URL).replace(/^https?:\/\//, "")
        : null,
    },
    vercel: {
      configured: !("error" in vercel),
      error: "error" in vercel ? vercel.error : null,
      projectRef: "error" in vercel ? null : vercel.projectRef,
      hasTeamId: "error" in vercel ? false : !!vercel.teamId,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "마스터 권한이 필요합니다." }, { status: 401 });
  }

  const supabaseError = getSupabaseConfigError();
  if (supabaseError || !isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          supabaseError ||
          "Supabase가 설정되지 않았습니다. Vercel에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 추가하세요.",
      },
      { status: 503 }
    );
  }

  let body: CreateSiteInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const siteName = String(body.siteName || "").trim();
  const subdomain = normalizeHostname(String(body.subdomain || "").trim());
  const keywords = String(body.keywords || "").trim();
  const bodyContent = String(body.bodyContent || "").trim();
  const slackWebhook = String(body.slackWebhook || "").trim();
  const naverVerification = String(body.naverVerification || "").trim();
  const naverAccountId = String(body.naverAccountId || "").trim();
  const siteDesign = parseSiteDesignId(body.siteDesign);
  const isRestore = body.mode === "restore";

  if (!siteName || siteName.length < 2) {
    return NextResponse.json({ error: "사이트 이름을 입력해 주세요." }, { status: 400 });
  }

  if (!subdomain || !DOMAIN_RE.test(subdomain)) {
    return NextResponse.json(
      { error: "올바른 서브도메인을 입력해 주세요. (예: abc.eanimal.kr)" },
      { status: 400 }
    );
  }

  if (slackWebhook && !slackWebhook.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json({ error: "Slack Webhook URL 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    if (await isSubdomainTaken(subdomain)) {
      return NextResponse.json(
        { error: "이미 등록된 서브도메인입니다." },
        { status: 409 }
      );
    }

    const themeColor = pickThemeColor(subdomain);
    const settings = await getSettings();
    const imageCount = Math.max(4, settings.imageCount ?? 20);
    const contentData: TenantContentData = pickTenantContentPackage(
      subdomain,
      siteName,
      keywords,
      bodyContent,
      imageCount,
      siteDesign
    );

    const defaultLimit = resolveDailySeoLimit(settings);
    const dailySeoLimitRaw = body.dailySeoLimit;
    const dailySeoLimit =
      dailySeoLimitRaw !== undefined && dailySeoLimitRaw !== null && String(dailySeoLimitRaw).trim() !== ""
        ? Math.max(0, Number.parseInt(String(dailySeoLimitRaw), 10) || defaultLimit)
        : defaultLimit;

    let linkedNaverAccountId: string | null = null;
    if (naverAccountId) {
      const account = await fetchNaverAccountById(naverAccountId);
      if (!account || !account.is_active) {
        return NextResponse.json(
          { error: "선택한 네이버 계정을 찾을 수 없거나 비활성입니다." },
          { status: 400 }
        );
      }
      linkedNaverAccountId = account.id;
    }

    const row = await insertTenantSiteConfig({
      site_name: siteName,
      subdomain,
      theme_color: themeColor,
      content_data: contentData,
      naver_verification: naverVerification || null,
      slack_webhook: slackWebhook || null,
      naver_account_id: linkedNaverAccountId,
      naver_site_registered_at: null,
      daily_seo_limit: dailySeoLimit,
      seo_quota_date: null,
      seo_quota_count: 0,
    });

    let naverRegisterQueued = false;
    if (linkedNaverAccountId) {
      await enqueueNaverSiteRegistration({
        siteConfigId: row.id,
        naverAccountId: linkedNaverAccountId,
        siteName,
        subdomain,
      });
      naverRegisterQueued = true;
    }

    const vercel = await registerVercelDomain(subdomain);
    let vercelNote = "";

    if (!vercel.ok) {
      const err = vercel.error || "Vercel 도메인 등록에 실패했습니다.";
      if (isRestore) {
        vercelNote = ` (Vercel: ${err} — 재등록은 DB 복구만 진행됨)`;
      } else if (err.includes("다른 Vercel 프로젝트")) {
        vercelNote = ` (경고: ${err} — DB에는 저장됨)`;
      } else {
        vercelNote = ` (Vercel 자동 등록 생략: ${err})`;
      }
    } else if (vercel.data?.alreadyLinked) {
      vercelNote = isRestore
        ? " (기존 Vercel 도메인 연결 확인됨)"
        : " (Vercel 도메인은 이미 연결되어 있었습니다)";
    }

    const siteUrl = `https://${subdomain}`;

    return NextResponse.json({
      success: true,
      siteId: row.id,
      subdomain,
      siteUrl,
      themeColor,
      vercelDomain: vercel.ok ? vercel.data : undefined,
      vercelSkipped: !vercel.ok,
      naverRegisterQueued,
      siteDesign,
      restored: isRestore,
      message: isRestore
        ? `기존 사이트가 등록 목록에 복구되었습니다. (${siteDesignLabel(siteDesign)})${vercelNote}${
            naverRegisterQueued ? " VM 네이버 등록 대기열에 추가되었습니다." : ""
          } ${siteUrl} 에서 테넌트로 다시 동작합니다. SEO 페이지·대기열은 삭제 시 함께 지워졌을 수 있습니다.`
        : `사이트가 Supabase에 저장되었습니다. (${siteDesignLabel(siteDesign)})${vercelNote}${
            naverRegisterQueued ? " VM 네이버 등록 대기열에 추가되었습니다." : ""
          } ${siteUrl} 에서 확인하세요.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "사이트 생성 중 알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
