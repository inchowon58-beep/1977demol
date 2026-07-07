"use client";

import { useState } from "react";
import Link from "next/link";
import type { CreateSiteResult } from "@/types/tenant";

export default function RegisterSiteClient() {
  const [siteName, setSiteName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [keywords, setKeywords] = useState("");
  const [bodyContent, setBodyContent] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [naverVerification, setNaverVerification] = useState("");
  const [dailySeoLimit, setDailySeoLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreateSiteResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          subdomain,
          keywords,
          bodyContent,
          slackWebhook,
          naverVerification,
          ...(dailySeoLimit.trim() ? { dailySeoLimit: dailySeoLimit.trim() } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as CreateSiteResult & {
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || "사이트 생성에 실패했습니다.");
        setLoading(false);
        return;
      }

      setResult(data);
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange/5 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-orange uppercase tracking-wider mb-1">
              Multi-tenant SaaS
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark">신규 사이트 등록</h1>
            <p className="text-sm text-gray-500 mt-2">
              Supabase + Vercel API로 서브도메인 사이트를 자동 생성합니다.
            </p>
          </div>
          <Link href="/admin/sites" className="text-sm text-orange hover:underline shrink-0">
            등록 사이트 목록
          </Link>
          <Link href="/admin/master" className="text-sm text-orange hover:underline shrink-0">
            ← 마스터
          </Link>
        </div>

        {result?.success ? (
          <div className="bg-white rounded-2xl shadow-lg border border-emerald-200 p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl font-bold mb-4">
              ✓
            </div>
            <h2 className="text-xl font-bold text-dark mb-2">사이트 생성 완료</h2>
            <p className="text-sm text-gray-600 mb-6">{result.message}</p>
            {result.siteUrl && (
              <a
                href={result.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-orange text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-light transition"
              >
                {result.siteUrl} 바로가기 →
              </a>
            )}
            {result.siteId && (
              <Link
                href={`/admin/sites/${result.siteId}`}
                className="mt-4 inline-block text-sm text-orange hover:underline"
              >
                Slack·네이버 설정 추가하기 →
              </Link>
            )}
            {result.themeColor && (
              <div className="mt-6 flex justify-center gap-2">
                {(["primary", "secondary", "dark"] as const).map((key) => (
                  <span
                    key={key}
                    className="h-8 w-8 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: result.themeColor![key] }}
                    title={key}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setSiteName("");
                setSubdomain("");
                setKeywords("");
                setBodyContent("");
                setSlackWebhook("");
                setNaverVerification("");
                setDailySeoLimit("");
              }}
              className="mt-6 text-sm text-gray-500 hover:text-orange"
            >
              + 다른 사이트 추가 등록
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사이트 이름</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="예: 강남철거센터"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">서브도메인 주소</label>
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="abc.eanimal.kr"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Vercel 프로젝트에 자동 등록됩니다. DNS는 도메인 업체에서 CNAME 설정이 필요할 수 있습니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">핵심 키워드</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="예: 강남철거, 상가철거, 폐업지원금"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사이트 본문 · 소개</label>
              <textarea
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                placeholder="사이트 메인 소개 문구, 카테고리 설명 등"
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange resize-y text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                일일 SEO 생성 한도 (선택)
              </label>
              <input
                type="number"
                min={0}
                value={dailySeoLimit}
                onChange={(e) => setDailySeoLimit(e.target.value)}
                placeholder="비우면 마스터 전역 설정과 동일"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
              <p className="text-xs text-gray-400 mt-1">
                테넌트마다 독립 카운트됩니다. 예: 메인 30개 + gangnam11 30개 각각 생성 가능.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slack Webhook (선택)</label>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                네이버 사이트 인증 메타값 (선택)
              </label>
              <input
                type="text"
                value={naverVerification}
                onChange={(e) => setNaverVerification(e.target.value)}
                placeholder="네이버 서치어드바이저 verification content"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange text-white font-bold text-lg rounded-xl hover:bg-orange-light transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  생성 및 배포 중...
                </>
              ) : (
                "사이트 생성 및 배포"
              )}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          기존 단일 사이트(환경변수·settings.json)는 영향 없이 그대로 동작합니다.
        </p>
      </div>
    </div>
  );
}
