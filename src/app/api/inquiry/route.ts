import { NextRequest, NextResponse } from "next/server";
import { addInquiryLead } from "@/lib/data";
import { notifyInquiryToSlack } from "@/lib/slack-notify";
import { getResolvedSiteConfig } from "@/utils/siteConfig";

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return /^01[016789]\d{7,8}$/.test(digits) || /^0\d{9,10}$/.test(digits);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const businessType = String(body.businessType || "").trim();
  const area = String(body.area || "").trim();
  const message = String(body.message || "").trim();
  const keyword = String(body.keyword || "").trim();
  const pageSlug = String(body.pageSlug || "").trim();
  const pageTitle = String(body.pageTitle || "").trim();
  const privacyAgreed = body.privacyAgreed === true;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "이름을 2자 이상 입력해 주세요." }, { status: 400 });
  }
  if (!phone || !isValidPhone(phone)) {
    return NextResponse.json({ error: "올바른 연락처를 입력해 주세요." }, { status: 400 });
  }
  if (!privacyAgreed) {
    return NextResponse.json(
      { error: "개인정보 수집·이용에 동의해 주세요." },
      { status: 400 }
    );
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const referrer = req.headers.get("referer") || "";
  const userAgent = req.headers.get("user-agent") || "";

  const lead = await addInquiryLead({
    name,
    phone,
    address,
    businessType,
    area,
    message,
    keyword,
    pageSlug,
    pageTitle,
    referrer,
    ip,
    userAgent,
  });

  const { config, tenant } = await getResolvedSiteConfig();
  void notifyInquiryToSlack(lead, {
    brandName: config.brandName,
    siteUrl: config.url,
    webhookUrl: tenant?.slack_webhook?.trim() || undefined,
  });

  return NextResponse.json({
    success: true,
    id: lead.id,
    message: "견적 신청이 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.",
  });
}
