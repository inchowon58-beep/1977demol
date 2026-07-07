"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ExternalLink from "@/components/ExternalLink";
import NaverExposureCard from "@/components/NaverExposureCard";
import type { ExposureMode } from "@/lib/exposure-mode";

interface SiteForm {
  brandName: string;
  companyName: string;
  tagline: string;
  description: string;
  url: string;
  phone: string;
  email: string;
  address: string;
  businessNumber: string;
  representative: string;
  imageCdn: string;
  imageCount: number;
  supportBase: string;
  supportExtra: string;
  supportMax: string;
  dailySeoLimit: number;
  serviceAvailableDays: number;
  naverExposureId: string;
  exposureMode: ExposureMode;
}

const emptySiteForm: SiteForm = {
  brandName: "",
  companyName: "",
  tagline: "",
  description: "",
  url: "",
  phone: "",
  email: "",
  address: "",
  businessNumber: "",
  representative: "",
  imageCdn: "",
  imageCount: 20,
  supportBase: "",
  supportExtra: "",
  supportMax: "",
  dailySeoLimit: 10,
  serviceAvailableDays: 30,
  naverExposureId: "",
  exposureMode: "company",
};

interface SeoQuotaPreview {
  limit: number;
  used: number;
  remaining: number;
  serviceDaysRemaining: number;
  serviceExpiresAt: string;
}

export default function MasterSettingsClient() {
  const [siteForm, setSiteForm] = useState<SiteForm>(emptySiteForm);
  const [quotaPreview, setQuotaPreview] = useState<SeoQuotaPreview | null>(null);
  const [serviceExpiresAt, setServiceExpiresAt] = useState("");
  const [naverExposurePassword, setNaverExposurePassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [naverClientId, setNaverClientId] = useState("");
  const [naverClientSecret, setNaverClientSecret] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasNaverApi, setHasNaverApi] = useState(false);
  const [collectionSiteUrl, setCollectionSiteUrl] = useState("");
  const [collectionWorkerSecret, setCollectionWorkerSecret] = useState("");
  const [hasCollectionWorkerSecret, setHasCollectionWorkerSecret] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [hasSlackWebhook, setHasSlackWebhook] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadQuotaPreview() {
    const res = await fetch("/api/admin/seo-quota", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setQuotaPreview({
      limit: data.limit ?? 10,
      used: data.used ?? 0,
      remaining: data.remaining ?? 0,
      serviceDaysRemaining: data.service?.daysRemaining ?? 0,
      serviceExpiresAt: data.service?.expiresAt || "",
    });
  }

  async function loadSecretFlags() {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/master";
      return;
    }
    if (!res.ok) return;
    const settings = await res.json();
    setHasApiKey(settings.hasApiKey);
    setHasNaverApi(settings.hasNaverApi);
    setCollectionSiteUrl(settings.collectionSiteUrl || settings.url || "");
    setHasCollectionWorkerSecret(!!settings.hasCollectionWorkerSecret);
    setHasSlackWebhook(!!settings.hasSlackWebhook);
  }

  async function loadSettings() {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/master";
      return;
    }
    if (!res.ok) return;
    const settings = await res.json();
    setHasApiKey(settings.hasApiKey);
    setHasNaverApi(settings.hasNaverApi);
    setCollectionSiteUrl(settings.collectionSiteUrl || settings.url || "");
    setHasCollectionWorkerSecret(!!settings.hasCollectionWorkerSecret);
    setHasSlackWebhook(!!settings.hasSlackWebhook);
    setServiceExpiresAt(settings.serviceExpiresAt || "");
    setSiteForm({
      brandName: settings.brandName || "",
      companyName: settings.companyName || "",
      tagline: settings.tagline || "",
      description: settings.description || "",
      url: settings.url || "",
      phone: settings.phone || "",
      email: settings.email || "",
      address: settings.address || "",
      businessNumber: settings.businessNumber || "",
      representative: settings.representative || "",
      imageCdn: settings.imageCdn || "",
      imageCount: settings.imageCount || 20,
      supportBase: settings.supportBase || "",
      supportExtra: settings.supportExtra || "",
      supportMax: settings.supportMax || "",
      dailySeoLimit: settings.dailySeoLimit ?? 10,
      serviceAvailableDays: settings.serviceAvailableDays ?? 30,
      naverExposureId: settings.naverExposureId || "",
      exposureMode: settings.exposureMode === "cpa" ? "cpa" : "company",
    });
    setNaverExposurePassword(settings.naverExposurePassword || "");
  }

  useEffect(() => {
    void loadSettings();
    void loadQuotaPreview();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...siteForm,
          geminiApiKey: apiKey || undefined,
          naverClientId: naverClientId || undefined,
          naverClientSecret: naverClientSecret || undefined,
          naverExposurePassword: naverExposurePassword || undefined,
          collectionSiteUrl: collectionSiteUrl || undefined,
          collectionWorkerSecret: collectionWorkerSecret || undefined,
          slackWebhookUrl: slackWebhookUrl || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage("마스터 설정이 저장되었습니다.");
        if (data.serviceExpiresAt) setServiceExpiresAt(data.serviceExpiresAt);
        if (data.dailySeoLimit !== undefined) {
          setSiteForm((prev) => ({ ...prev, dailySeoLimit: data.dailySeoLimit }));
        }
        if (data.serviceAvailableDays !== undefined) {
          setSiteForm((prev) => ({
            ...prev,
            serviceAvailableDays: data.serviceAvailableDays,
          }));
        }
        setQuotaPreview((prev) => {
          const limit = data.dailySeoLimit ?? prev?.limit ?? siteForm.dailySeoLimit;
          const used = prev?.used ?? 0;
          return {
            limit,
            used,
            remaining: Math.max(0, limit - used),
            serviceDaysRemaining:
              data.serviceDaysRemaining ?? prev?.serviceDaysRemaining ?? 0,
            serviceExpiresAt: data.serviceExpiresAt || prev?.serviceExpiresAt || "",
          };
        });
        setApiKey("");
        setNaverClientId("");
        setNaverClientSecret("");
        setCollectionWorkerSecret("");
        setSlackWebhookUrl("");
        await loadSecretFlags();
        await loadQuotaPreview();
      } else {
        setMessage("설정 저장 실패.");
      }
    } catch {
      setMessage("설정 저장 중 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  const siteField = (
    label: string,
    key: keyof SiteForm,
    opts?: { type?: string; rows?: number; placeholder?: string }
  ) => (
    <div className={opts?.rows ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {opts?.rows ? (
        <textarea
          value={siteForm[key] as string}
          onChange={(e) => setSiteForm({ ...siteForm, [key]: e.target.value })}
          rows={opts.rows}
          placeholder={opts.placeholder}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange resize-y"
        />
      ) : (
        <input
          type={opts?.type || "text"}
          value={
            key === "imageCount" || key === "dailySeoLimit" || key === "serviceAvailableDays"
              ? siteForm[key]
              : (siteForm[key] as string)
          }
          onChange={(e) =>
            setSiteForm({
              ...siteForm,
              [key]:
                key === "imageCount" ||
                key === "dailySeoLimit" ||
                key === "serviceAvailableDays"
                  ? parseInt(e.target.value, 10) || 0
                  : e.target.value,
            })
          }
          placeholder={opts?.placeholder}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">마스터 설정</h1>
            <p className="text-sm text-gray-500">사이트 전체 설정 · 사용기간 · SEO 일일 한도</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/sites" className="text-orange font-medium hover:underline">
              등록 사이트
            </Link>
            <Link href="/admin/register" className="text-orange font-medium hover:underline">
              + 신규 사이트
            </Link>
            <Link href="/admin" className="text-orange hover:underline">← 관리자</Link>
            <Link href="/" className="text-gray-400 hover:underline">메인</Link>
          </div>
        </div>

        {quotaPreview && (
          <div className="mb-6 rounded-xl px-4 py-3 border border-orange/20 bg-white text-sm">
            <p className="font-medium text-dark">
              사용가능일{" "}
              <span className="text-orange">{quotaPreview.serviceDaysRemaining}일</span>
              {quotaPreview.serviceExpiresAt && (
                <span className="text-gray-500 font-normal">
                  {" "}
                  (만료 {quotaPreview.serviceExpiresAt})
                </span>
              )}
              <span className="text-gray-300 mx-2">|</span>
              일일 최적화 한도{" "}
              <span className="text-orange">{quotaPreview.remaining}개</span>
              <span className="text-gray-500 font-normal"> / {quotaPreview.limit}개</span>
              <span className="text-gray-400 font-normal text-xs ml-2">
                (오늘 {quotaPreview.used}개 사용)
              </span>
            </p>
          </div>
        )}

        <NaverExposureCard
          exposureId={siteForm.naverExposureId}
          exposurePassword={naverExposurePassword}
          editable
          onIdChange={(v) => setSiteForm({ ...siteForm, naverExposureId: v })}
          onPasswordChange={setNaverExposurePassword}
        />

        {message && (
          <p className="mb-4 text-sm text-dark bg-orange/10 p-3 rounded-xl">{message}</p>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-red-200">
            <h2 className="font-bold text-dark mb-2">사용 가능일</h2>
            <p className="text-xs text-gray-500 mb-4">
              저장 시 오늘부터 계산됩니다. 기간 만료 후에는 새 SEO 페이지 생성이 제한됩니다.
              기존페이지는 삭제 또는 변경될수 있습니다.
            </p>
            {siteField("사용 가능일 (일)", "serviceAvailableDays", {
              type: "number",
              placeholder: "30",
            })}
            {serviceExpiresAt && (
              <p className="mt-3 text-sm text-gray-600">
                만료 예정일: <strong>{serviceExpiresAt}</strong> (KST)
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-orange/20">
            <h2 className="font-bold text-dark mb-2">SEO 일일 최적화 한도</h2>
            <p className="text-xs text-gray-400 mb-4">
              당사 인프라에서 하루에 최적화할 수 있는 SEO 페이지 수입니다. (자정 KST 기준 초기화)
            </p>
            {siteField("하루 생성 가능 수량", "dailySeoLimit", {
              type: "number",
              placeholder: "10",
            })}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-indigo-200">
            <h2 className="font-bold text-dark mb-2">업체 노출 방식</h2>
            <p className="text-xs text-gray-500 mb-4">
              사이트에 업체 연락처·주소를 노출할지, 견적 문의 폼(CPA)만 사용할지 선택합니다.
            </p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-orange/40 has-[:checked]:border-orange has-[:checked]:bg-orange/5">
                <input
                  type="radio"
                  name="exposureMode"
                  value="cpa"
                  checked={siteForm.exposureMode === "cpa"}
                  onChange={() => setSiteForm({ ...siteForm, exposureMode: "cpa" })}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-dark">CPA 방식 (견적 문의만)</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    「3초 견적신청 문의하기」 폼으로 DB 수집. 업체 전화번호·회사명·주소는 사이트에
                    노출하지 않고 브랜드·사이트 주소만 표시합니다.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-orange/40 has-[:checked]:border-orange has-[:checked]:bg-orange/5">
                <input
                  type="radio"
                  name="exposureMode"
                  value="company"
                  checked={siteForm.exposureMode === "company"}
                  onChange={() => setSiteForm({ ...siteForm, exposureMode: "company" })}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-dark">업체정보 등록 방식</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    업체 전화·주소·사업자 정보와 「3초 견적문의」 버튼을 함께 노출합니다. 상단·하단
                    플로팅 바에 전화 + 견적문의가 같이 표시됩니다.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-dark mb-2">업체 정보</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {siteField("브랜드명", "brandName")}
              {siteField("회사명", "companyName")}
              {siteField("대표", "representative")}
              {siteField("대표번호", "phone")}
              {siteField("이메일", "email", { type: "email" })}
              {siteField("사업자등록번호", "businessNumber")}
              {siteField("주소", "address")}
              {siteField("사이트 URL", "url")}
              {siteField("슬로건", "tagline")}
              {siteField("사이트 설명", "description", { rows: 3 })}
              {siteField("지원금 기본", "supportBase")}
              {siteField("추가 지원", "supportExtra")}
              {siteField("지원금 최대", "supportMax")}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-dark mb-2">이미지 CDN</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {siteField("이미지 CDN URL", "imageCdn")}
              {siteField("이미지 개수", "imageCount", { type: "number" })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-emerald-200">
            <h2 className="font-bold text-dark mb-2">네이버 웹문서 수집 (VM 연동)</h2>
            <p className="text-xs text-gray-500 mb-4">
              서치어드바이저에 등록된 사이트 URL과 VM 프로그램 인증 토큰입니다. VM은{" "}
              <code className="text-orange">/api/collection-worker/jobs</code> API로 대기 URL을
              가져갑니다.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수집요청 사이트 URL
                </label>
                <input
                  type="url"
                  value={collectionSiteUrl}
                  onChange={(e) => setCollectionSiteUrl(e.target.value)}
                  placeholder="https://demolishzone.yourdogzone.co.kr"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
                />
                <p className="text-xs text-gray-400 mt-1">
                  서치어드바이저 사이트 선택 시 사용하는 주소와 동일하게 입력
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VM Worker API 토큰
                </label>
                <input
                  type="password"
                  placeholder={hasCollectionWorkerSecret ? "설정됨 (변경 시 입력)" : "임의의 긴 문자열"}
                  value={collectionWorkerSecret}
                  onChange={(e) => setCollectionWorkerSecret(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
                />
                <p className="text-xs text-gray-400 mt-1">
                  VM 프로그램 Authorization: Bearer {"{토큰}"} — docs/COLLECTION_WORKER.md 참고
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-dark mb-2">네이버 지역검색 API</h2>
            <p className="text-xs text-gray-400 mb-4">
              <ExternalLink
                href="https://developers.naver.com/docs/serviceapi/search/local/local.md"
                className="text-orange underline"
              >
                네이버 개발자센터
              </ExternalLink>
              에서 사용 API → 「검색」 선택
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input
                  type="password"
                  placeholder={hasNaverApi ? "설정됨 (변경 시 입력)" : "Client ID"}
                  value={naverClientId}
                  onChange={(e) => setNaverClientId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                <input
                  type="password"
                  placeholder={hasNaverApi ? "설정됨 (변경 시 입력)" : "Client Secret"}
                  value={naverClientSecret}
                  onChange={(e) => setNaverClientSecret(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-violet-200">
            <h2 className="font-bold text-dark mb-2">Slack 견적 문의 알림</h2>
            <p className="text-xs text-gray-500 mb-4">
              상세페이지에서 견적 신청이 접수되면 Slack 채널로 즉시 알림을 보냅니다.{" "}
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange underline"
              >
                Slack Incoming Webhook
              </a>
              URL을 입력하세요. (Vercel 환경변수 <code className="text-orange">SLACK_INQUIRY_WEBHOOK_URL</code>{" "}
              로도 설정 가능)
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Webhook URL
              </label>
              <input
                type="password"
                placeholder={
                  hasSlackWebhook ? "설정됨 (변경 시 입력)" : "https://hooks.slack.com/services/..."
                }
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
              <p className="text-xs text-gray-400 mt-1">
                {hasSlackWebhook
                  ? "✓ 알림 연동됨 — 견적 신청 시 Slack으로 이름·연락처·키워드 등이 전송됩니다."
                  : "Webhook URL 저장 후 견적 신청 테스트를 해보세요."}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-dark mb-4">Gemini API</h2>
            <input
              type="password"
              placeholder={hasApiKey ? "설정됨 (변경 시 입력)" : "Gemini API 키"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-orange text-white font-bold rounded-xl hover:bg-orange-light transition disabled:opacity-50"
          >
            {saving ? "저장 중..." : "마스터 설정 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}
