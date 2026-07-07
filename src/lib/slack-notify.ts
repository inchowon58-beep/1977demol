import type { InquiryLead, Settings } from "./data";
import { countInquiryLeadsThisMonthKst, getSettings } from "./data";

export function resolveSlackWebhookUrl(settings?: Settings): string {
  const fromSettings = settings?.slackWebhookUrl?.trim();
  if (fromSettings) return fromSettings;
  return process.env.SLACK_INQUIRY_WEBHOOK_URL?.trim() || "";
}

function kstMonthLabel(): string {
  const parts = new Date()
    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long" })
    .split(" ");
  return parts.slice(0, 2).join(" ");
}

function formatKstDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function displayValue(value: string): string {
  const trimmed = value.trim();
  return trimmed || "—";
}

function optionalRow(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `*${label}*  ${trimmed}`;
}

export async function notifyInquiryToSlack(
  lead: InquiryLead,
  options?: { brandName?: string; siteUrl?: string; webhookUrl?: string }
): Promise<boolean> {
  const settings = await getSettings();
  const webhookUrl =
    options?.webhookUrl?.trim() || resolveSlackWebhookUrl(settings);
  if (!webhookUrl) return false;

  const brand = options?.brandName || "견적 문의";
  const siteBase = (options?.siteUrl || "").replace(/\/$/, "");
  const pageUrl = siteBase && lead.pageSlug ? `${siteBase}/guide/${lead.pageSlug}` : "";
  const monthTotal = await countInquiryLeadsThisMonthKst();
  const monthLabel = kstMonthLabel();
  const createdAt = formatKstDateTime(lead.createdAt);

  const customerLines = [
    `*이름*  ${displayValue(lead.name)}`,
    `*연락처*  ${displayValue(lead.phone)}`,
    optionalRow("주소", lead.address),
    optionalRow("업종", lead.businessType),
    optionalRow("평수", lead.area),
  ].filter((line): line is string => line !== null);

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "📩 새 견적 문의가 접수되었습니다", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${brand}*\n📅 *${monthLabel} 총 문의*  *${monthTotal}건*`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ["*👤 고객 정보*", ...customerLines].join("\n"),
      },
    },
  ];

  if (lead.keyword.trim()) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎯 유입 키워드*\n${lead.keyword.trim()}`,
      },
    });
  }

  if (lead.message.trim()) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💬 문의내용*\n>${lead.message.trim().slice(0, 1200).replace(/\n/g, "\n>")}`,
      },
    });
  }

  const metaParts = [`🕐 ${createdAt}`];
  if (lead.pageTitle.trim()) metaParts.push(`📄 ${lead.pageTitle.trim()}`);
  if (lead.ip) metaParts.push(`IP ${lead.ip}`);

  blocks.push(
    { type: "divider" },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: metaParts.join("  ·  ") }],
    }
  );

  if (pageUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "🔗 유입 페이지", emoji: true },
          url: pageUrl,
        },
      ],
    });
  }

  const fallbackText = `[${brand}] 새 견적 문의 — ${lead.name} / ${lead.phone} (${monthLabel} 총 ${monthTotal}건)`;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: fallbackText, blocks }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
