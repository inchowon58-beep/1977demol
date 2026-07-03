import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import { DataStorageError, getPages, savePage, deletePage } from "@/lib/data";
import { buildSeoSlug, ensureUniqueSeoSlug } from "@/lib/seo-slug";
import { generateSeoContent } from "@/lib/gemini";
import { getSiteConfig } from "@/lib/site-config";
import { getImageIndexFromSeed } from "@/lib/site-images";
import { resolveLocalPartnersForKeyword } from "@/lib/local-business";

function getNaverCredentials(site: Awaited<ReturnType<typeof getSiteConfig>>) {
  return {
    naverClientId: site.naverClientId || process.env.NAVER_CLIENT_ID || "",
    naverClientSecret: site.naverClientSecret || process.env.NAVER_CLIENT_SECRET || "",
  };
}

export async function GET() {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pages = await getPages();
  return NextResponse.json(pages);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyword } = await req.json();

  if (!keyword?.trim()) {
    return NextResponse.json({ error: "키워드를 입력해주세요" }, { status: 400 });
  }

  try {
    const trimmedKeyword = keyword.trim();
    const site = await getSiteConfig();

    const generated = await generateSeoContent({
      keyword: trimmedKeyword,
      apiKey: site.geminiApiKey || process.env.GEMINI_API_KEY || "",
      site,
    });

    const now = new Date().toISOString();
    const pageId = `page-${Date.now()}`;
    const existingPages = await getPages();
    const baseSlug = buildSeoSlug(trimmedKeyword, pageId, generated.slug);
    const slug = await ensureUniqueSeoSlug(
      baseSlug,
      existingPages.map((p) => p.slug)
    );

    const { region, partners } = await resolveLocalPartnersForKeyword(
      trimmedKeyword,
      getNaverCredentials(site)
    );

    const page = {
      id: pageId,
      slug,
      keyword: trimmedKeyword,
      regionName: region || undefined,
      title: generated.title,
      description: generated.description,
      content: generated.content,
      faqs: generated.faqs,
      localPartners: partners.length > 0 ? partners : undefined,
      imageIndex: getImageIndexFromSeed(slug, site),
      createdAt: now,
      updatedAt: now,
    };

    await savePage(page);
    return NextResponse.json(page);
  } catch (error) {
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
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deletePage(id);
  return NextResponse.json({ success: true });
}
