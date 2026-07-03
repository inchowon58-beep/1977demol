"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { guidePageUrl } from "@/lib/constants";
import MasterPasswordModal from "@/components/MasterPasswordModal";
import ExternalLink from "@/components/ExternalLink";

interface SeoPage {
  id: string;
  slug: string;
  keyword: string;
  title: string;
  createdAt: string;
}

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
};

type Tab = "seo" | "settings";

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("seo");
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [keyword, setKeyword] = useState("");
  const [siteForm, setSiteForm] = useState<SiteForm>(emptySiteForm);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [naverClientId, setNaverClientId] = useState("");
  const [naverClientSecret, setNaverClientSecret] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasNaverApi, setHasNaverApi] = useState(false);
  const [message, setMessage] = useState("");
  const [masterUnlocked, setMasterUnlocked] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [copiedPageId, setCopiedPageId] = useState<string | null>(null);

  useEffect(() => {
    initAdmin();
  }, []);

  const initAdmin = async () => {
    const masterRes = await fetch("/api/auth/master/status");
    const masterData = await masterRes.json();
    const unlocked = !!masterData.authenticated;
    setMasterUnlocked(unlocked);
    if (!unlocked) {
      setShowMasterModal(true);
    }
    await loadData(unlocked);
  };

  const loadData = async (withMaster = masterUnlocked) => {
    setLoading(true);
    try {
      if (withMaster) {
        const [pagesRes, settingsRes] = await Promise.all([
          fetch("/api/admin/pages"),
          fetch("/api/admin/settings"),
        ]);
        if (pagesRes.status === 401) {
          window.location.href = "/";
          return;
        }
        if (pagesRes.ok) setPages(await pagesRes.json());
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setHasApiKey(settings.hasApiKey);
          setHasNaverApi(settings.hasNaverApi);
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
          });
        }
      }
    } catch {
      setMessage("데이터 로드 실패");
    }
    setLoading(false);
  };

  const handleTabClick = (t: Tab) => {
    if (!masterUnlocked) {
      setPendingTab(t);
      setShowMasterModal(true);
      return;
    }
    setTab(t);
  };

  const handleMasterSuccess = async () => {
    setMasterUnlocked(true);
    setShowMasterModal(false);
    if (pendingTab) {
      setTab(pendingTab);
      setPendingTab(null);
    }
    await loadData(true);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    if (!masterUnlocked) {
      setShowMasterModal(true);
      setMessage("SEO 페이지 생성을 위해 마스터 비밀번호를 입력해주세요.");
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
        loadData(true);
      } else if (res.status === 401) {
        setMasterUnlocked(false);
        setShowMasterModal(true);
        setMessage("마스터 비밀번호 인증이 필요합니다. 다시 입력해주세요.");
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || "SEO 페이지 생성 실패.");
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
    loadData(true);
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

  const handleSaveSettings = async (e: React.FormEvent) => {
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
        }),
      });
      if (res.ok) {
        setMessage("설정이 저장되었습니다. 메인·SEO 페이지에 즉시 반영됩니다.");
        setApiKey("");
        setNaverClientId("");
        setNaverClientSecret("");
        setHasApiKey(true);
        setHasNaverApi(true);
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
          value={key === "imageCount" ? siteForm.imageCount : (siteForm[key] as string)}
          onChange={(e) =>
            setSiteForm({
              ...siteForm,
              [key]: key === "imageCount" ? parseInt(e.target.value, 10) || 20 : e.target.value,
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
            <h1 className="text-2xl font-bold text-dark">관리자 페이지</h1>
            <p className="text-sm text-gray-500">{siteForm.brandName || "사이트 설정"}</p>
          </div>
          <Link href="/" className="text-sm text-orange hover:underline">← 메인으로</Link>
        </div>

        <div className="flex gap-2 mb-6">
          {(["seo", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabClick(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === t ? "bg-dark text-white" : "bg-white text-dark border border-gray-200"
              }`}
            >
              {t === "seo"
                ? `SEO 페이지${masterUnlocked ? "" : " 🔒"}`
                : `사이트 설정${masterUnlocked ? "" : " 🔒"}`}
            </button>
          ))}
        </div>

        {message && (
          <p className="mb-4 text-sm text-dark bg-orange/10 p-3 rounded-xl">{message}</p>
        )}

        {tab === "seo" && (
          <>
            {!masterUnlocked && (
              <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                SEO 페이지 생성·관리를 위해 마스터 비밀번호 인증이 필요합니다.
              </p>
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
                  />
                </div>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-8 py-3 bg-orange text-white font-bold rounded-xl hover:bg-orange-light transition disabled:opacity-50"
                >
                  {generating ? "AI 생성 중..." : "SEO 페이지 생성"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-dark mb-4">생성된 SEO 페이지 ({pages.length})</h2>
              {loading ? (
                <p className="text-gray-400">로딩 중...</p>
              ) : pages.length === 0 ? (
                <p className="text-gray-400">아직 생성된 페이지가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {pages.map((page) => (
                    <div key={page.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-100 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-medium text-dark text-sm">{page.title}</p>
                        <p className="text-xs text-gray-400 mt-1 break-all">
                          {page.keyword} · {guidePageUrl(page.slug)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Link href={guidePageUrl(page.slug)} target="_blank" className="text-xs px-3 py-1.5 border border-dark text-dark rounded-lg">보기</Link>
                        <button type="button" onClick={() => copySeoLink(page.slug, page.id)} className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                          {copiedPageId === page.id ? "복사됨" : "링크복사"}
                        </button>
                        <button onClick={() => handleDeletePage(page.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg">삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "settings" && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-dark mb-2">업체 정보</h2>
              <p className="text-xs text-gray-400 mb-4">
                저장 시 메인 페이지·푸터·기존 SEO 페이지·이후 생성 페이지에 모두 즉시 반영됩니다.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {siteField("브랜드명", "brandName", { placeholder: "1977철거" })}
                {siteField("회사명", "companyName", { placeholder: "주식회사베룸" })}
                {siteField("대표", "representative")}
                {siteField("대표번호", "phone", { placeholder: "1555-7321" })}
                {siteField("이메일", "email", { type: "email" })}
                {siteField("사업자등록번호", "businessNumber")}
                {siteField("주소", "address", { placeholder: "전체 주소" })}
                {siteField("사이트 URL", "url", { placeholder: "https://..." })}
                {siteField("슬로건", "tagline", { placeholder: "메인 헤드라인 문구" })}
                {siteField("사이트 설명", "description", { rows: 3 })}
                {siteField("지원금 기본", "supportBase", { placeholder: "600만원" })}
                {siteField("추가 지원", "supportExtra", { placeholder: "400만원" })}
                {siteField("지원금 최대", "supportMax", { placeholder: "1000만원" })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-dark mb-2">이미지 CDN</h2>
              <p className="text-xs text-gray-400 mb-4">
                CDN 주소를 변경하면 모든 페이지 이미지가 한 번에 바뀝니다. (예: .../chul/01.webp)
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {siteField("이미지 CDN URL", "imageCdn", {
                  placeholder: "https://image.cattery.co.kr/chul",
                })}
                {siteField("이미지 개수", "imageCount", { type: "number", placeholder: "20" })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-dark mb-2">네이버 지역검색 API</h2>
              <p className="text-xs text-gray-400 mb-4">
                SEO 페이지 생성 시 해당 지역 타일·도배·장판·철물 업체 정보를 네이버 지도에서
                자동 수집합니다.{" "}
                <ExternalLink
                  href="https://developers.naver.com/docs/serviceapi/search/local/local.md"
                  className="text-orange underline"
                >
                  네이버 개발자센터
                </ExternalLink>
                에서 애플리케이션을 등록할 때 <strong className="text-gray-600">사용 API → 「검색」</strong>
                을 선택하세요. 지역검색은 별도 항목이 아니라 검색 API에 포함되어 있습니다.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID
                  </label>
                  <input
                    type="password"
                    placeholder={hasNaverApi ? "설정됨 (변경 시 입력)" : "네이버 Client ID"}
                    value={naverClientId}
                    onChange={(e) => setNaverClientId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    placeholder={hasNaverApi ? "설정됨 (변경 시 입력)" : "네이버 Client Secret"}
                    value={naverClientSecret}
                    onChange={(e) => setNaverClientSecret(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                또는 .env.local에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수로 설정
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-dark mb-4">Gemini API</h2>
              <input
                type="password"
                placeholder={hasApiKey ? "API 키 설정됨 (변경 시 입력)" : "Gemini API 키 입력"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-orange"
              />
              <p className="text-xs text-gray-400 mt-2">또는 .env.local에 GEMINI_API_KEY 환경변수로 설정</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-orange text-white font-bold rounded-xl hover:bg-orange-light transition disabled:opacity-50"
            >
              {saving ? "저장 중..." : "설정 저장"}
            </button>
          </form>
        )}
      </div>

      {showMasterModal && (
        <MasterPasswordModal
          onClose={() => {
            setShowMasterModal(false);
            setPendingTab(null);
          }}
          onSuccess={handleMasterSuccess}
        />
      )}
    </div>
  );
}
