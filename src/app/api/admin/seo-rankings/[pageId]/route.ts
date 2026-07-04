import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getPageRankingDetail } from "@/lib/seo-ranking";

interface Props {
  params: Promise<{ pageId: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const detail = await getPageRankingDetail(pageId);
  if (!detail) {
    return NextResponse.json({ error: "페이지를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
