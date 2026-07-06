import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import { insertTenantSiteConfig, isSubdomainTaken, normalizeHostname } from "@/lib/supabase/tenant-db";
import { pickThemeColor } from "@/lib/tenant-theme";
import type { CreateSiteInput, TenantContentData } from "@/types/tenant";

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function sanitizeEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

function validateVercelEnv(): { token: string; projectId: string; teamId?: string } | { error: string } {
  const token = sanitizeEnv(process.env.VERCEL_TOKEN);
  const projectId = sanitizeEnv(process.env.VERCEL_PROJECT_ID);
  const teamId = sanitizeEnv(process.env.VERCEL_TEAM_ID);

  if (!token || !projectId) {
    return {
      error: "VERCEL_TOKEN 또는 VERCEL_PROJECT_ID 환경변수가 설정되지 않았습니다.",
    };
  }

  if (projectId.includes("/") || projectId.startsWith("http")) {
    return {
      error:
        "VERCEL_PROJECT_ID 형식이 잘못되었습니다. URL이나 '팀/프로젝트명'이 아니라 prj_로 시작하는 Project ID만 입력하세요. (Vercel → 프로젝트 → Settings → General)",
    };
  }

  if (!projectId.startsWith("prj_")) {
    return {
      error:
        "VERCEL_PROJECT_ID는 prj_로 시작해야 합니다. 프로젝트 이름(예: 1977demol)이 아니라 Settings → General의 Project ID를 복사하세요.",
    };
  }

  if (teamId && !teamId.startsWith("team_")) {
    return {
      error:
        "VERCEL_TEAM_ID는 team_로 시작해야 합니다. 개인 계정이면 VERCEL_TEAM_ID를 비우세요.",
    };
  }

  return { token, projectId, teamId: teamId || undefined };
}

type VercelEnv = { token: string; projectId: string; teamId?: string };

function buildVercelApiUrl(path: string, env: VercelEnv): URL {
  const url = new URL(`https://api.vercel.com${path}`);
  if (env.teamId) url.searchParams.set("teamId", env.teamId);
  return url;
}

async function fetchProjectDomain(
  domain: string,
  env: VercelEnv
): Promise<{ name: string; verified?: boolean } | null> {
  const url = buildVercelApiUrl(
    `/v9/projects/${encodeURIComponent(env.projectId)}/domains/${encodeURIComponent(domain)}`,
    env
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${env.token}` },
  });

  if (!res.ok) return null;

  const body = await res.json().catch(() => ({}));
  return {
    name: (body as { name?: string }).name || domain,
    verified: (body as { verified?: boolean }).verified,
  };
}

async function registerVercelDomain(domain: string): Promise<{
  ok: boolean;
  data?: { name: string; verified?: boolean; alreadyLinked?: boolean };
  error?: string;
}> {
  const env = validateVercelEnv();
  if ("error" in env) {
    return { ok: false, error: env.error };
  }

  const existing = await fetchProjectDomain(domain, env);
  if (existing) {
    return {
      ok: true,
      data: { ...existing, alreadyLinked: true },
    };
  }

  const url = buildVercelApiUrl(
    `/v10/projects/${encodeURIComponent(env.projectId)}/domains`,
    env
  );

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const raw =
        (body as { error?: { message?: string } }).error?.message ||
        (body as { message?: string }).message ||
        `Vercel 도메인 등록 실패 (HTTP ${res.status})`;

      const lower = raw.toLowerCase();
      if (lower.includes("already") && lower.includes("project")) {
        const onThisProject = await fetchProjectDomain(domain, env);
        if (onThisProject) {
          return {
            ok: true,
            data: { ...onThisProject, alreadyLinked: true },
          };
        }

        return {
          ok: false,
          error:
            `${domain} 은(는) 이미 다른 Vercel 프로젝트에 연결되어 있습니다. ` +
            "Vercel 대시보드 → Domains(또는 해당 프로젝트 Settings → Domains)에서 기존 연결을 해제한 뒤 다시 시도하세요. " +
            "현재 멀티테넌트 앱과 같은 프로젝트에 도메인이 있어야 합니다.",
        };
      }

      const hint =
        raw.includes("Invalid path") || raw.includes("invalid path")
          ? " VERCEL_PROJECT_ID가 prj_로 시작하는지, 팀 프로젝트면 VERCEL_TEAM_ID(team_)가 맞는지 확인하세요."
          : "";

      return { ok: false, error: raw + hint };
    }

    return {
      ok: true,
      data: {
        name: (body as { name?: string }).name || domain,
        verified: (body as { verified?: boolean }).verified,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Vercel API 호출 중 오류",
    };
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "마스터 권한이 필요합니다." }, { status: 401 });
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

    const vercel = await registerVercelDomain(subdomain);
    if (!vercel.ok) {
      return NextResponse.json(
        { error: vercel.error || "Vercel 도메인 등록에 실패했습니다." },
        { status: 502 }
      );
    }

    const themeColor = pickThemeColor(subdomain);
    const contentData: TenantContentData = {
      keywords,
      body: bodyContent,
      description: bodyContent.slice(0, 160) || `${siteName} 공식 사이트`,
      tagline: keywords.split(/[,\n]/)[0]?.trim() || siteName,
    };

    const row = await insertTenantSiteConfig({
      site_name: siteName,
      subdomain,
      theme_color: themeColor,
      content_data: contentData,
      naver_verification: naverVerification || null,
      slack_webhook: slackWebhook || null,
    });

    const siteUrl = `https://${subdomain}`;
    const vercelNote = vercel.data?.alreadyLinked
      ? " (Vercel 도메인은 이미 연결되어 있었습니다)"
      : "";

    return NextResponse.json({
      success: true,
      siteId: row.id,
      subdomain,
      siteUrl,
      themeColor,
      vercelDomain: vercel.data,
      message: `사이트가 생성되었습니다.${vercelNote} DNS 전파 후 ${siteUrl} 에서 확인하세요.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "사이트 생성 중 알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
