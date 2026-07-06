"use client";

import { useState } from "react";
import {
  INQUIRY_PRIVACY_SECTIONS,
  INQUIRY_PRIVACY_SUMMARY,
} from "@/lib/inquiry-privacy";

interface QuickInquiryFormProps {
  keyword: string;
  pageSlug: string;
  pageTitle: string;
  brandName: string;
}

const inputClass =
  "w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-orange text-sm bg-white";

export default function QuickInquiryForm({
  keyword,
  pageSlug,
  pageTitle,
  brandName,
}: QuickInquiryFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [area, setArea] = useState("");
  const [message, setMessage] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!privacyAgreed) {
      setError("개인정보 수집·이용에 동의해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          businessType,
          area,
          message,
          keyword,
          pageSlug,
          pageTitle,
          privacyAgreed: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
        setName("");
        setPhone("");
        setAddress("");
        setBusinessType("");
        setArea("");
        setMessage("");
        setPrivacyAgreed(false);
      } else {
        setError(data.error || "신청 중 오류가 발생했습니다.");
      }
    } catch {
      setError("신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <section
        id="quick-inquiry"
        className="mb-8 rounded-2xl border-2 border-[#03C75A]/30 bg-gradient-to-br from-[#e8f9ef] via-white to-white p-6 lg:p-8 shadow-sm"
      >
        <div className="text-center py-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#03C75A] text-white text-2xl font-bold mb-4">
            ✓
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">견적 신청이 완료되었습니다</h2>
          <p className="text-sm text-gray-600 mb-6">
            {brandName} 전문 상담사가 빠르게 연락드리겠습니다.
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="text-sm text-orange font-medium hover:underline"
          >
            추가 문의하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="quick-inquiry"
      className="mb-8 rounded-2xl overflow-hidden border border-orange/20 shadow-lg"
    >
      <div className="bg-gradient-to-r from-orange to-orange-light px-6 py-5 lg:px-8 text-white">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center justify-center bg-white/20 text-xs font-bold px-3 py-1 rounded-full">
            3초 견적
          </span>
          <h2 className="text-xl lg:text-2xl font-bold">3초 견적신청 문의하기</h2>
        </div>
        <p className="text-sm text-white/90 mt-2">
          {keyword} · 무료 방문 견적 · 폐업지원금 상담
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 lg:p-8">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-orange">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전화번호 <span className="text-orange">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              required
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예: 서울 강남구 역삼동"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">업종</label>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="예: 식당, 카페, 사무실"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">평수</label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="예: 30평"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">문의내용</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="철거 일정, 폐업지원금 문의 등 자유롭게 남겨주세요."
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-bg/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setPrivacyOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-dark hover:bg-gray-100/80 transition"
          >
            <span>개인정보 수집 및 이용 동의</span>
            <span className="text-orange text-lg">{privacyOpen ? "−" : "+"}</span>
          </button>
          {privacyOpen && (
            <div className="px-4 pb-4 text-xs text-gray-600 leading-relaxed space-y-3 border-t border-gray-200 pt-3 max-h-56 overflow-y-auto">
              <p className="font-medium text-gray-700">{INQUIRY_PRIVACY_SUMMARY}</p>
              {INQUIRY_PRIVACY_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="font-semibold text-gray-800 mb-1">{section.title}</p>
                  <p className="whitespace-pre-line">{section.body}</p>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-start gap-3 px-4 py-3 border-t border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange"
            />
            <span className="text-sm text-gray-700">
              위 <strong>개인정보 수집 및 이용</strong>에 동의합니다.{" "}
              <span className="text-orange">(필수)</span>
            </span>
          </label>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full py-4 bg-dark text-white font-bold text-lg rounded-xl hover:bg-dark-light transition disabled:opacity-50 shadow-md"
        >
          {submitting ? "신청 중..." : "신청하기"}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          신청 후 전문 상담사가 빠르게 연락드립니다.
        </p>
      </form>
    </section>
  );
}
