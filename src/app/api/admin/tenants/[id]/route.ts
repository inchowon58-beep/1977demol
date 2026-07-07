import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import {
  fetchTenantById,
  getSupabaseConfigError,
  updateTenantSiteConfig,
} from "@/lib/supabase/tenant-db";
import { toTenantSiteDetail } from "@/lib/tenant-serialize";
import type { TenantContentData, UpdateTenantSiteInput } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const row = await fetchTenantById(id);
  if (!row) {
    return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(toTenantSiteDetail(row), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const { id } = await context.params;
  const existing = await fetchTenantById(id);
  if (!existing) {
    return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as UpdateTenantSiteInput;
  const patch: Partial<typeof existing> = {};
  const content: TenantContentData = { ...(existing.content_data || {}) };

  if (body.siteName !== undefined) {
    const siteName = String(body.siteName).trim();
    if (!siteName) {
      return NextResponse.json({ error: "사이트 이름을 입력해 주세요." }, { status: 400 });
    }
    patch.site_name = siteName;
  }

  if (body.keywords !== undefined) {
    content.keywords = String(body.keywords).trim();
  }
  if (body.bodyContent !== undefined) {
    content.body = String(body.bodyContent).trim();
  }
  if (body.tagline !== undefined) {
    content.tagline = String(body.tagline).trim();
  }
  if (body.description !== undefined) {
    content.description = String(body.description).trim();
  }

  if (
    body.keywords !== undefined ||
    body.bodyContent !== undefined ||
    body.tagline !== undefined ||
    body.description !== undefined
  ) {
    patch.content_data = content;
  }

  if (body.slackWebhook !== undefined) {
    const raw = String(body.slackWebhook).trim();
    if (!raw || raw === "••••••••") {
      // omit — keep existing
    } else if (raw === "__clear__") {
      patch.slack_webhook = null;
    } else if (!raw.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "Slack Webhook URL은 https://hooks.slack.com/ 로 시작해야 합니다." },
        { status: 400 }
      );
    } else {
      patch.slack_webhook = raw;
    }
  }

  if (body.naverVerification !== undefined) {
    const value = String(body.naverVerification).trim();
    patch.naver_verification = value || null;
  }

  if (body.dailySeoLimit !== undefined) {
    if (body.dailySeoLimit === null || String(body.dailySeoLimit).trim() === "") {
      patch.daily_seo_limit = null;
    } else {
      const parsed = Number.parseInt(String(body.dailySeoLimit), 10);
      patch.daily_seo_limit = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  try {
    const updated = await updateTenantSiteConfig(id, patch);
    return NextResponse.json({
      success: true,
      site: toTenantSiteDetail(updated),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장 실패" },
      { status: 500 }
    );
  }
}
