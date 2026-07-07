"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TenantSiteSummary } from "@/types/tenant";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {label} {ok ? "✓" : "—"}
    </span>
  );
}

export default function TenantSitesClient() {
  const [sites, setSites] = useState<TenantSiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/tenants", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/admin/master";
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "목록을 불러오지 못했습니다.");
          return;
        }
        setSites(Array.isArray(data.sites) ? data.sites : []);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange/5 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-orange uppercase tracking-wider mb-1">
              Multi-tenant SaaS
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark">등록 사이트 목록</h1>
            <p className="text-sm text-gray-500 mt-2">
              Supabase에 등록된 서브도메인 사이트를 확인하고 Slack·네이버 소유확인 설정을 수정합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm shrink-0">
            <Link
              href="/admin/register"
              className="text-orange font-medium hover:underline"
            >
              + 신규 등록
            </Link>
            <Link href="/admin/master" className="text-gray-500 hover:underline">
              마스터 설정
            </Link>
            <Link href="/admin" className="text-gray-400 hover:underline">
              관리자
            </Link>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : sites.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">등록된 테넌트 사이트가 없습니다.</p>
              <Link
                href="/admin/register"
                className="inline-flex items-center gap-2 bg-orange text-white font-bold px-5 py-2.5 rounded-xl hover:bg-orange-light transition text-sm"
              >
                + 첫 사이트 등록
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">사이트</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">도메인</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">연동</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">등록일</th>
                    <th className="px-4 py-3 font-semibold text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sites.map((site) => (
                    <tr key={site.id} className="hover:bg-orange/5 transition">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-dark">{site.siteName}</p>
                        <p className="text-xs text-gray-400 mt-0.5 sm:hidden font-mono">
                          {site.subdomain}
                        </p>
                        {site.designVariant && (
                          <span className="text-[10px] text-gray-400 uppercase mt-1 inline-block">
                            {site.designVariant}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <a
                          href={site.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-orange hover:underline break-all"
                        >
                          {site.subdomain}
                        </a>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge ok={site.hasSlackWebhook} label="Slack" />
                          <StatusBadge ok={site.hasNaverVerification} label="네이버" />
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(site.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/admin/sites/${site.id}`}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-orange rounded-lg hover:bg-orange-light transition"
                          >
                            수정
                          </Link>
                          <a
                            href={`${site.siteUrl}/admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-orange/40 transition"
                          >
                            관리자
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && sites.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">
            총 {sites.length}개 사이트 · Slack·네이버 설정은 각 사이트 「수정」에서 추가할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
