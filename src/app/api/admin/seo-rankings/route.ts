import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getAllRankingSummaries } from "@/lib/seo-ranking";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAllRankingSummaries();
  return NextResponse.json(data);
}
