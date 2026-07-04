import { NextResponse } from "next/server";
import { runAllRankingChecks } from "@/lib/seo-ranking";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron — 하루 2회(09:00·21:00 KST) 네이버 웹문서 순위 수집 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAllRankingChecks();
  return NextResponse.json({ ok: true, ...result });
}
