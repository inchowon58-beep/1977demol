"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteDesignPreview } from "@/components/admin/SiteDesignPreview";
import { SITE_DESIGN_OPTIONS, parseSiteDesignId } from "@/lib/site-designs";

export default function DesignPreviewClient() {
  const searchParams = useSearchParams();
  const designId = parseSiteDesignId(searchParams.get("design"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange/5 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold text-orange uppercase tracking-wider mb-1">
              Design Preview
            </p>
            <h1 className="text-2xl font-bold text-dark">사이트 디자인 미리보기</h1>
            <p className="text-sm text-gray-500 mt-1">
              실제 생성 시 선택한 디자인 레이아웃·섹션 구성을 확인합니다.
            </p>
          </div>
          <Link
            href="/admin/register"
            className="text-sm text-orange font-medium hover:underline shrink-0"
          >
            ← 사이트 등록으로
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {SITE_DESIGN_OPTIONS.map((option) => (
            <Link
              key={option.id}
              href={`/admin/design-preview?design=${option.id}`}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                designId === option.id
                  ? "border-orange bg-orange text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange/40"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <SiteDesignPreview designId={designId} variant="full" showMeta showFullLink={false} />

        <p className="text-center text-xs text-gray-400 mt-8">
          샘플 와이어프레임입니다. 생성 후 테마 색·문구·이미지는 사이트마다 달라집니다.
        </p>
      </div>
    </div>
  );
}
