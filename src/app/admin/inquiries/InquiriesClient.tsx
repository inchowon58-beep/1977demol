"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { guidePageUrl } from "@/lib/constants";

interface InquiryLead {
  id: string;
  name: string;
  phone: string;
  address: string;
  businessType: string;
  area: string;
  message: string;
  keyword: string;
  pageSlug: string;
  pageTitle: string;
  referrer: string;
  ip: string;
  createdAt: string;
  status: "new" | "read" | "done";
}

interface InquirySummary {
  total: number;
  thisMonth: number;
  monthLabel: string;
  new: number;
  read: number;
  done: number;
}

const STATUS_LABEL = { new: "신규", read: "확인", done: "완료" } as const;

function isLeadThisMonthKst(createdAt: string): boolean {
  const monthKey = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
    .slice(0, 7);
  const leadMonth = new Date(createdAt)
    .toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
    .slice(0, 7);
  return leadMonth === monthKey;
}

export default function InquiriesClient() {
  const [leads, setLeads] = useState<InquiryLead[]>([]);
  const [summary, setSummary] = useState<InquirySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "month" | "new" | "read" | "done">("all");
  const [selected, setSelected] = useState<InquiryLead | null>(null);
  const [message, setMessage] = useState("");

  async function loadLeads() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inquiries", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setSummary(data.summary || null);
      }
    } catch {
      setMessage("문의 목록을 불러오지 못했습니다.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadLeads();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return leads;
    if (filter === "month") return leads.filter((l) => isLeadThisMonthKst(l.createdAt));
    return leads.filter((l) => l.status === filter);
  }, [leads, filter]);

  const updateStatus = async (id: string, status: InquiryLead["status"]) => {
    const res = await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 문의를 삭제하시겠습니까?")) return;
    const res = await fetch("/api/admin/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (selected?.id === id) setSelected(null);
      void loadLeads();
    }
  };

  const exportCsv = () => {
    const header = [
      "접수일",
      "이름",
      "전화번호",
      "주소",
      "업종",
      "평수",
      "문의내용",
      "키워드",
      "페이지",
      "상태",
      "IP",
      "유입경로",
    ];
    const rows = filtered.map((l) => [
      l.createdAt.slice(0, 16).replace("T", " "),
      l.name,
      l.phone,
      l.address,
      l.businessType,
      l.area,
      l.message.replace(/"/g, '""'),
      l.keyword,
      l.pageTitle,
      STATUS_LABEL[l.status],
      l.ip,
      l.referrer,
    ]);
    const csv =
      "\uFEFF" +
      [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inquiry-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">견적 문의 DB</h1>
            <p className="text-sm text-gray-500">상세페이지 CPA 견적 신청 내역</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-orange hover:underline">
              ← 관리자
            </Link>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {(
              [
                ["month", `${summary.monthLabel}`, summary.thisMonth],
                ["all", "전체 누적", summary.total],
                ["new", "신규", summary.new],
                ["read", "확인", summary.read],
                ["done", "완료", summary.done],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  filter === key
                    ? key === "month"
                      ? "border-orange bg-orange text-white"
                      : "border-orange bg-orange/5"
                    : key === "month"
                      ? "border-orange/40 bg-orange/5 hover:border-orange"
                      : "border-gray-200 bg-white hover:border-orange/30"
                }`}
              >
                <p
                  className={`text-xs ${filter === key && key === "month" ? "text-white/90" : key === "month" ? "text-orange font-medium" : "text-gray-500"}`}
                >
                  {key === "month" ? "이번달" : label}
                </p>
                <p
                  className={`text-2xl font-bold ${filter === key && key === "month" ? "text-white" : "text-dark"}`}
                >
                  {count}
                  {key === "month" && <span className="text-base font-bold ml-0.5">건</span>}
                </p>
                {key === "month" && (
                  <p
                    className={`text-[10px] mt-0.5 ${filter === key ? "text-white/80" : "text-gray-400"}`}
                  >
                    Slack 알림과 동일
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {message && (
          <p className="mb-4 text-sm bg-orange/10 text-dark p-3 rounded-xl">{message}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => void loadLeads()}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40"
          >
            CSV 다운로드
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <p className="p-6 text-sm text-gray-400">불러오는 중...</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">문의 내역이 없습니다.</p>
            ) : (
              <ul className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100">
                {filtered.map((lead) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(lead);
                        if (lead.status === "new") void updateStatus(lead.id, "read");
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                        selected?.id === lead.id ? "bg-orange/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-dark">{lead.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lead.status === "new"
                              ? "bg-orange text-white"
                              : lead.status === "read"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[lead.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{lead.phone}</p>
                      <p className="text-xs text-gray-400 mt-1 truncate">{lead.keyword}</p>
                      <p className="text-[10px] text-gray-300 mt-1">
                        {lead.createdAt.slice(0, 16).replace("T", " ")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {!selected ? (
              <p className="text-sm text-gray-400 text-center py-16">왼쪽에서 문의를 선택하세요.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-dark">{selected.name}</h2>
                    <a
                      href={`tel:${selected.phone.replace(/[^\d]/g, "")}`}
                      className="text-orange font-semibold"
                    >
                      {selected.phone}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["new", "read", "done"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void updateStatus(selected.id, s)}
                        className={`text-xs px-3 py-1 rounded-lg border ${
                          selected.status === s
                            ? "bg-dark text-white border-dark"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void handleDelete(selected.id)}
                      className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["주소", selected.address || "-"],
                    ["업종", selected.businessType || "-"],
                    ["평수", selected.area || "-"],
                    ["키워드", selected.keyword],
                    ["유입 페이지", selected.pageTitle],
                    ["접수일", selected.createdAt.slice(0, 16).replace("T", " ")],
                    ["IP", selected.ip || "-"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-bg/80 rounded-lg px-3 py-2">
                      <dt className="text-xs text-gray-500">{label}</dt>
                      <dd className="font-medium text-dark break-all">{value}</dd>
                    </div>
                  ))}
                </dl>

                {selected.message && (
                  <div className="rounded-xl border border-gray-100 bg-gray-bg/50 p-4">
                    <p className="text-xs text-gray-500 mb-1">문의내용</p>
                    <p className="text-sm text-dark whitespace-pre-wrap">{selected.message}</p>
                  </div>
                )}

                {selected.pageSlug && (
                  <a
                    href={guidePageUrl(selected.pageSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-orange hover:underline"
                  >
                    유입 상세페이지 보기 →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
