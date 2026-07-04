"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { guidePageUrl } from "@/lib/constants";
import RankingHistoryModal from "@/components/RankingHistoryModal";

interface SeoPage {
  id: string;
  slug: string;
  keyword: string;
  title: string;
  createdAt: string;
}

interface RankingSummary {
  pageId: string;
  keyword: string;
  rank: number | null;
  change: number | null;
  checkedAt: string | null;
}

interface SeoQuota {
  limit: number;
  used: number;
  remaining: number;
  today: string;
  service?: {
    daysRemaining: number;
    expiresAt: string | null;
    active: boolean;
    expired: boolean;
  };
}

export default function AdminClient() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [keyword, setKeyword] = useState("");
  const [brandName, setBrandName] = useState("");
  const [quota, setQuota] = useState<SeoQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedPageId, setCopiedPageId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Map<string, RankingSummary>>(new Map());
  const [rankingsUpdated, setRankingsUpdated] = useState<string | null>(null);
  const [hasNaverApi, setHasNaverApi] = useState(true);
  const [rankModal, setRankModal] = useState<{ pageId: string; keyword: string } | null>(null);

  function formatRank(rank: number | null): string {
    if (rank === null) return "-";
    return `${rank}위`;
  }

  function formatRankChange(change: number | null): string {
    if (change === null || change === 0) return "";
    return change > 0 ? ` ▲${change}` : ` ▼${Math.abs(change)}`;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pagesRes, quotaRes, configRes, rankingsRes] = await Promise.all([
        fetch("/api/admin/pages"),
        fetch("/api/admin/seo-quota"),
        fetch("/api/site-config"),
        fetch("/api/admin/seo-rankings"),
      ]);
      if (pagesRes.status === 401) {
        window.location.href = "/";
        return;
      }
      if (pagesRes.ok) setPages(await pagesRes.json());
      if (quotaRes.ok) setQuota(await quotaRes.json());
      if (configRes.ok) {
        const config = await configRes.json();
        setBrandName(config.brandName || "");
      }
      if (rankingsRes.ok) {
        const data = await rankingsRes.json();
        setRankings(new Map(data.summaries.map((s: RankingSummary) => [s.pageId, s])));
        setRankingsUpdated(data.lastUpdated || null);
        setHasNaverApi(data.hasNaverApi !== false);
      }
    } catch {
      setMessage("데이터 로드 실패");
    }
    setLoading(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    if (quota && quota.remaining <= 0) {
      setMessage("오늘 생성 가능한 SEO 페이지 수량을 모두 사용했습니다.");
      return;
    }
    if (quota?.service && !quota.service.active) {
      setMessage("사용 기간이 만료되어 SEO 페이지를 생성할 수 없습니다.");
      return;
    }
    setGenerating(true);
    setMessage("Gemini AI로 SEO 문서 생성 중...");
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      if (res.ok) {
        const page = await res.json();
        setMessage(`"${page.title}" SEO 페이지가 생성되었습니다.`);
        setKeyword("");
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || "SEO 페이지 생성 실패.");
        if (res.status === 429) loadData();
      }
    } catch {
      setMessage("생성 중 오류가 발생했습니다.");
    }
    setGenerating(false);
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm("이 SEO 페이지를 삭제하시겠습니까?")) return;
    await fetch("/api/admin/pages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadData();
  };

  const copySeoLink = async (slug: string, pageId: string) => {
    const url = `${window.location.origin}${guidePageUrl(slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPageId(pageId);
      setTimeout(() => setCopiedPageId(null), 2000);
    } catch {
      setMessage("링크 복사에 실패했습니다.");
    }
  };

  const serviceActive = !quota?.service || quota.service.active;
  const canGenerate = serviceActive && (!quota || quota.remaining > 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">관리자 페이지</h1>
            <p className="text-sm text-gray-500">{brandName || "SEO 페이지 관리"}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/master" className="text-orange font-medium hover:underline">
              ⚙️ 마스터 설정
            </Link>
            <Link href="/" className="text-gray-400 hover:underline">← 메인</Link>
          </div>
        </div>

        {quota && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 border text-sm ${
              serviceActive && quota.remaining > 0
                ? "bg-white border-gray-200 text-dark"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <p className="font-medium">
              사용가능일{" "}
              <span className="text-orange">{quota.service?.daysRemaining ?? 0}일</span>
              {quota.service?.expiresAt && (
                <span className="text-gray-500 font-normal">
                  {" "}
                  (만료 {quota.service.expiresAt})
                </span>
              )}
              <span className="text-gray-300 mx-2">|</span>
              오늘 생성 가능{" "}
              <span className="text-orange">{quota.remaining}개</span>
              <span className="text-gray-500 font-normal">
                {" "}
                / {quota.limit}개
              </span>
            </p>
          </div>
        )}

        {message && (
          <p className="mb-4 text-sm text-dark bg-orange/10 p-3 rounded-xl">{message}</p>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-bold text-dark mb-4">SEO 페이지 생성</h2>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">키워드</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 의정부철거업체, 강남 상가철거"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
                required
                disabled={!canGenerate}
              />
            </div>
            <button
              type="submit"
              disabled={generating || !canGenerate}
              className="px-8 py-3 bg-orange text-white font-bold rounded-xl hover:bg-orange-light transition disabled:opacity-50"
            >
              {generating ? "AI 생성 중..." : "SEO 페이지 생성"}
            </button>
            {!canGenerate && quota.service && !quota.service.active && (
              <p className="text-xs text-red-500">
                사용 기간이 만료되었습니다. 마스터 설정에서 기간 연장 후 이용하세요.
              </p>
            )}
            {!canGenerate && serviceActive && quota.remaining <= 0 && (
              <p className="text-xs text-red-500">
                오늘 생성 한도에 도달했습니다. 마스터 설정에서 한도를 조정하거나 내일 다시 시도하세요.
              </p>
            )}
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-dark">생성된 SEO 페이지 ({pages.length})</h2>
            {rankingsUpdated && (
              <p className="text-xs text-gray-400">
                순위 갱신: {new Date(rankingsUpdated).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 하루 2회 자동 확인
              </p>
            )}
          </div>
          {!hasNaverApi && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Naver 검색 API가 설정되지 않아 순위 확인이 불가합니다. 마스터 설정에서 Client ID/Secret을 등록하세요.
            </p>
          )}
          {loading ? (
            <p className="text-gray-400">로딩 중...</p>
          ) : pages.length === 0 ? (
            <p className="text-gray-400">아직 생성된 페이지가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {pages.map((page) => {
                const rankInfo = rankings.get(page.id);
                return (
                <div
                  key={page.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-100 rounded-xl"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-dark text-sm">{page.title}</p>
                    <p className="text-xs text-gray-400 mt-1 break-all">
                      {page.keyword} · {guidePageUrl(page.slug)}
                    </p>
                    {hasNaverApi && (
                      <p className="text-xs mt-2">
                        <span className="text-gray-500">네이버 순위 </span>
                        <span className="font-semibold text-orange">
                          {formatRank(rankInfo?.rank ?? null)}
                        </span>
                        {rankInfo?.change != null && rankInfo.change !== 0 && (
                          <span
                            className={
                              rankInfo.change > 0 ? "text-emerald-600" : "text-red-500"
                            }
                          >
                            {formatRankChange(rankInfo.change)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {hasNaverApi && (
                      <button
                        type="button"
                        onClick={() => setRankModal({ pageId: page.id, keyword: page.keyword })}
                        className="text-xs px-3 py-1.5 border border-orange/40 text-orange rounded-lg hover:bg-orange/5"
                      >
                        순위변동 확인
                      </button>
                    )}
                    <Link
                      href={guidePageUrl(page.slug)}
                      target="_blank"
                      className="text-xs px-3 py-1.5 border border-dark text-dark rounded-lg"
                    >
                      보기
                    </Link>
                    <button
                      type="button"
                      onClick={() => copySeoLink(page.slug, page.id)}
                      className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                    >
                      {copiedPageId === page.id ? "복사됨" : "링크복사"}
                    </button>
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>

      {rankModal && (
        <RankingHistoryModal
          pageId={rankModal.pageId}
          keyword={rankModal.keyword}
          onClose={() => setRankModal(null)}
        />
      )}
    </div>
  );
}
