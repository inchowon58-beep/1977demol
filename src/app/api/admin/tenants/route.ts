import { NextResponse } from "next/server";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import { getSupabaseConfigError, listAllTenants } from "@/lib/supabase/tenant-db";
import { toTenantSiteSummary } from "@/lib/tenant-serialize";

export async function GET() {
  if (!(await isAuthenticated()) || !(await isMasterAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const rows = await listAllTenants();
    return NextResponse.json(
      {
        sites: rows.map(toTenantSiteSummary),
        total: rows.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "목록 조회 실패" },
      { status: 500 }
    );
  }
}
