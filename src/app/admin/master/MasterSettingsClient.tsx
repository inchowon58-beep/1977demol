"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ExternalLink from "@/components/ExternalLink";
import NaverExposureCard from "@/components/NaverExposureCard";

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
};

export default function MasterSettingsClient() {
  const [siteForm, setSiteForm] = useState<SiteForm>(emptySiteForm);
  const [serviceExpiresAt, setServiceExpiresAt] = useState("");
  const [naverExposurePassword, setNaverExposurePassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [naverClientId, setNaverClientId] = useState("");
  const [naverClientSecret, setNaverClientSecret] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasNaverApi, setHasNaverApi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const res = await fetch("/api/admin/settings");
    if (res.status === 401) {
      window.location.href = "/admin/master";
      return;
    }
    if (!res.ok) return;
    const settings = await res.json();
    setHasApiKey(settings.hasApiKey);
    setHasNaverApi(settings.hasNaverApi);
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
    });
    setNaverExposurePassword(settings.naverExposurePassword || "");
  };

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
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage("마스터 설정이 저장되었습니다.");
        if (data.serviceExpiresAt) setServiceExpiresAt(data.serviceExpiresAt);
        setApiKey("");
        setNaverClientId("");
        setNaverClientSecret("");
        await loadSettings();
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
            <Link href="/admin" className="text-orange hover:underline">← 관리자</Link>
            <Link href="/" className="text-gray-400 hover:underline">메인</Link>
          </div>
        </div>

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
              저장 시 오늘부터 계산됩니다. 기간 만료 후에는 새 페이지 생성만 제한되며, 기존 페이지는
              관리자가 직접 삭제할 때까지 유지됩니다.
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
            <h2 className="font-bold text-dark mb-2">SEO 일일 생성 한도</h2>
            <p className="text-xs text-gray-400 mb-4">
              관리자 페이지에서 하루에 생성할 수 있는 SEO 페이지 수 (자정 KST 초기화)
            </p>
            {siteField("하루 생성 가능 수량", "dailySeoLimit", {
              type: "number",
              placeholder: "10",
            })}
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
