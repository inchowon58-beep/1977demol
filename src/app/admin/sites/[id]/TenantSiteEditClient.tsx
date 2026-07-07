"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TenantSiteDetail } from "@/types/tenant";

interface Props {
  siteId: string;
}

export default function TenantSiteEditClient({ siteId }: Props) {
  const [site, setSite] = useState<TenantSiteDetail | null>(null);
  const [siteName, setSiteName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [bodyContent, setBodyContent] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [clearSlack, setClearSlack] = useState(false);
  const [naverVerification, setNaverVerification] = useState("");
  const [dailySeoLimit, setDailySeoLimit] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/tenants/${siteId}`, { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/admin/master";
          return;
        }
        if (res.status === 404) {
          setError("사이트를 찾을 수 없습니다.");
          return;
        }
        const data = (await res.json()) as TenantSiteDetail;
        if (!res.ok) {
          setError((data as { error?: string }).error || "불러오기 실패");
          return;
        }
        setSite(data);
        setSiteName(data.siteName);
        setKeywords(data.keywords);
        setBodyContent(data.bodyContent);
        setTagline(data.tagline);
        setDescription(data.description);
        setNaverVerification(data.naverVerification);
        setDailySeoLimit(
          data.dailySeoLimit != null ? String(data.dailySeoLimit) : ""
        );
        setSlackWebhook("");
        setClearSlack(false);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [siteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const payload: Record<string, unknown> = {
      siteName,
      keywords,
      bodyContent,
      tagline,
      description,
      naverVerification,
      dailySeoLimit: dailySeoLimit.trim() === "" ? null : dailySeoLimit.trim(),
    };

    if (clearSlack) {
      payload.slackWebhook = "__clear__";
    } else if (slackWebhook.trim()) {
      payload.slackWebhook = slackWebhook.trim();
    }

    try {
      const res = await fetch(`/api/admin/tenants/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      const updated = data.site as TenantSiteDetail;
      setSite(updated);
      setSlackWebhook("");
      setClearSlack(false);
      setMessage("저장되었습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4 text-center">
        <p className="text-red-600 mb-4">{error || "사이트를 찾을 수 없습니다."}</p>
        <Link href="/admin/sites" className="text-orange hover:underline text-sm">
          ← 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange/5 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin/sites"
              className="text-xs text-gray-400 hover:text-orange mb-2 inline-block"
            >
              ← 등록 사이트 목록
            </Link>
            <h1 className="text-2xl font-bold text-dark">{site.siteName}</h1>
            <a
              href={site.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-orange hover:underline mt-1 inline-block"
            >
              {site.siteUrl}
            </a>
          </div>
          <a
            href={`${site.siteUrl}/admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-orange shrink-0"
          >
            이 사이트 관리자 →
          </a>
        </div>

        {message && (
          <p className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-dark">기본 정보</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사이트 이름</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">서브도메인</label>
              <input
                type="text"
                value={site.subdomain}
                readOnly
                className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 font-mono text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">도메인 변경은 Vercel·DNS 재설정이 필요해 수정할 수 없습니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">슬로건</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사이트 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange resize-y text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">핵심 키워드</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">본문 · 소개</label>
              <textarea
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange resize-y text-sm"
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border-2 border-violet-200 p-6 space-y-4">
            <div>
              <h2 className="font-bold text-dark">Slack 견적 알림</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                이 사이트에서 견적 문의가 접수되면 지정한 Slack 채널로 알림이 갑니다.
                등록 직후 비워두었다면 여기서 Webhook URL을 추가하세요.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder={
                  site.hasSlackWebhook
                    ? "설정됨 — 변경하려면 새 URL 입력"
                    : "https://hooks.slack.com/services/..."
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange font-mono text-sm"
              />
              {site.hasSlackWebhook && (
                <label className="flex items-center gap-2 mt-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearSlack}
                    onChange={(e) => setClearSlack(e.target.checked)}
                  />
                  Slack 연동 해제
                </label>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border-2 border-emerald-200 p-6 space-y-4">
            <div>
              <h2 className="font-bold text-dark">네이버 사이트 소유확인</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                <a
                  href="https://searchadvisor.naver.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange underline"
                >
                  네이버 서치어드바이저
                </a>
                {" "}→ 사이트 추가 → <strong>HTML 태그</strong> 방식 선택 →{" "}
                <code className="text-orange bg-orange/5 px-1 rounded">content=&quot;...&quot;</code>{" "}
                안의 값만 아래에 입력하세요.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                naver-site-verification (content 값)
              </label>
              <input
                type="text"
                value={naverVerification}
                onChange={(e) => setNaverVerification(e.target.value)}
                placeholder="예: abc123def456..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-2">
                저장 후{" "}
                <a
                  href={site.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange underline"
                >
                  사이트 홈
                </a>
                {" "}소스에서{" "}
                <code className="bg-gray-100 px-1 rounded">&lt;meta name=&quot;naver-site-verification&quot;</code>{" "}
                태그가 반영됐는지 확인한 뒤, 서치어드바이저에서 「확인」을 누르세요.
              </p>
              {site.hasNaverVerification && (
                <p className="text-xs text-emerald-600 mt-1">✓ 인증 메타값이 설정되어 있습니다.</p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-orange/20 p-6 space-y-4">
            <h2 className="font-bold text-dark">SEO 일일 생성 한도</h2>
            <p className="text-xs text-gray-500">
              이 테넌트 전용 한도입니다. 비우면 마스터 전역 설정을 따릅니다.
              오늘 {site.seoQuotaUsedToday}개 사용 중.
            </p>
            <input
              type="number"
              min={0}
              value={dailySeoLimit}
              onChange={(e) => setDailySeoLimit(e.target.value)}
              placeholder="전역 설정과 동일 (비움)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange"
            />
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-orange text-white font-bold text-lg rounded-xl hover:bg-orange-light transition disabled:opacity-60"
          >
            {saving ? "저장 중..." : "변경사항 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}
