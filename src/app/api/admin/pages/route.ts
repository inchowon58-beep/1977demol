import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { DataStorageError, deletePage } from "@/lib/data";
import { createSeoPageFromKeyword, SeoCreateError } from "@/lib/seo-page-create";
import { removeCollectionJobsForPage } from "@/lib/collection-queue";
import { removeRankingForPage } from "@/lib/seo-ranking";
import { resolvePagesContext } from "@/lib/pages-resolver";
import { deleteTenantPage } from "@/lib/supabase/tenant-pages";
import { getResolvedSiteConfig } from "@/utils/siteConfig";

export const maxDuration = 120;

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { pages, tenant, isTenant } = await resolvePagesContext();
  return NextResponse.json({ pages, tenantId: tenant?.id ?? null, isTenant });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyword } = await req.json();

  if (!keyword?.trim()) {
    return NextResponse.json({ error: "키워드를 입력해주세요" }, { status: 400 });
  }

  try {
    const { page, collectionEnqueued, tenantId } = await createSeoPageFromKeyword(
      keyword.trim()
    );
    return NextResponse.json({
      ...page,
      collectionEnqueued,
      tenantId,
    });
  } catch (error) {
    if (error instanceof SeoCreateError) {
      const status =
        error.code === "QUOTA" ? 429 : error.code === "SERVICE" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof DataStorageError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("SEO page creation failed:", error);
    return NextResponse.json(
      { error: "SEO 페이지 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { tenant, isTenant } = await getResolvedSiteConfig();

  if (isTenant && tenant) {
    await deleteTenantPage(tenant.id, id);
    await removeCollectionJobsForPage(id, tenant.id);
  } else {
    await deletePage(id);
    await removeRankingForPage(id);
    await removeCollectionJobsForPage(id);
  }

  return NextResponse.json({ success: true });
}
