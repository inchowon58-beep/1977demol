import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  countInquiryLeadsThisMonthKst,
  deleteInquiryLead,
  getInquiryLeads,
  updateInquiryLeadStatus,
  type InquiryLeadStatus,
} from "@/lib/data";

function kstMonthLabel(): string {
  const parts = new Date()
    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long" })
    .split(" ");
  return parts.slice(0, 2).join(" ");
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [leads, thisMonth] = await Promise.all([
    getInquiryLeads(),
    countInquiryLeadsThisMonthKst(),
  ]);
  const summary = {
    total: leads.length,
    thisMonth,
    monthLabel: kstMonthLabel(),
    new: leads.filter((l) => l.status === "new").length,
    read: leads.filter((l) => l.status === "read").length,
    done: leads.filter((l) => l.status === "done").length,
  };

  return NextResponse.json(
    { leads, summary },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const status = body.status as InquiryLeadStatus;

  if (!id || !["new", "read", "done"].includes(status)) {
    return NextResponse.json({ error: "id와 status가 필요합니다." }, { status: 400 });
  }

  const ok = await updateInquiryLeadStatus(id, status);
  if (!ok) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const ok = await deleteInquiryLead(id);
  if (!ok) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
