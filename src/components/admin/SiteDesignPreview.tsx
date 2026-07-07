"use client";

import Link from "next/link";
import {
  SITE_DESIGN_OPTIONS,
  getSiteDesignOption,
  getSiteDesignPreview,
  type SiteDesignId,
} from "@/lib/site-designs";

const SAMPLE_BRAND = "강남철거센터";
const SAMPLE_TAGLINE = "강남철거 전문 · 폐업지원금 원스톱";

interface SiteDesignPreviewProps {
  designId: SiteDesignId;
  brandName?: string;
  /** mini=카드 썸네일, panel=선택 패널, full=전체 페이지 */
  variant?: "mini" | "panel" | "full";
  showMeta?: boolean;
  showFullLink?: boolean;
}

function PreviewHeader({ style }: { style: "standard" | "minimal" | "overlay" }) {
  if (style === "overlay") {
    return (
      <div className="h-7 px-2 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10">
        <span className="text-[8px] font-bold text-white truncate">브랜드</span>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <span key={i} className="w-4 h-1 rounded bg-white/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-7 px-2 flex items-center justify-between border-b shrink-0 ${
        style === "minimal" ? "bg-white/95" : "bg-white"
      }`}
    >
      <span className="text-[8px] font-bold text-gray-800 truncate">브랜드</span>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <span key={i} className="w-4 h-1 rounded bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

function PreviewHero({
  align,
  overlay,
  brandName,
  compact,
}: {
  align: "left" | "center";
  overlay?: boolean;
  brandName: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br from-gray-800 via-gray-700 to-orange/40 ${
        compact ? "h-24" : "h-40 sm:h-52"
      } ${overlay ? "mt-0" : ""}`}
    >
      {overlay && <PreviewHeader style="overlay" />}
      <div
        className={`relative z-[1] h-full flex flex-col justify-center px-3 ${
          align === "center" ? "items-center text-center" : "items-start text-left"
        }`}
      >
        <span className="inline-block bg-orange text-white text-[6px] font-bold px-1.5 py-0.5 rounded-full mb-1">
          배지
        </span>
        <p className={`font-black text-white leading-tight ${compact ? "text-[9px]" : "text-xs sm:text-sm"}`}>
          {brandName || SAMPLE_TAGLINE}
        </p>
        <div className={`flex gap-1 mt-1.5 ${align === "center" ? "justify-center" : ""}`}>
          <span className="h-4 w-10 rounded-full bg-orange text-[5px] text-white flex items-center justify-center font-bold">
            CTA
          </span>
          <span className="h-4 w-10 rounded-full bg-white/20 text-[5px] text-white flex items-center justify-center">
            문의
          </span>
        </div>
      </div>
    </div>
  );
}

function PreviewStats({ style, compact }: { style: "dark-bar" | "cards"; compact?: boolean }) {
  if (style === "cards") {
    return (
      <div className={`bg-gray-50 px-2 ${compact ? "py-2" : "py-3"}`}>
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-md shadow-sm py-1.5 text-center">
              <div className="text-[7px] font-bold text-orange">00</div>
              <div className="text-[5px] text-gray-400">항목</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 px-2 ${compact ? "py-2" : "py-3"}`}>
      <div className="grid grid-cols-4 gap-1 text-center">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="text-[7px] font-bold text-orange">00</div>
            <div className="text-[5px] text-gray-400">항목</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSections({ labels, compact }: { labels: readonly string[]; compact?: boolean }) {
  const shown = compact ? labels.slice(0, 4) : labels.slice(0, 6);
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      {shown.map((label, i) => (
        <div
          key={`${label}-${i}`}
          className={`px-2 border-b border-gray-100 ${compact ? "py-1.5" : "py-2"} ${
            i % 2 === 1 ? "bg-gray-50/80" : "bg-white"
          }`}
        >
          <div className="text-[6px] font-semibold text-gray-400 mb-0.5">{label}</div>
          <div className="flex gap-1">
            <span className="flex-1 h-2 rounded bg-gray-200/80" />
            <span className="w-6 h-2 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 디자인별 와이어프레임 미리보기 — SITE_DESIGN_OPTIONS.preview 스펙 기반 */
export function SiteDesignPreview({
  designId,
  brandName = SAMPLE_BRAND,
  variant = "panel",
  showMeta = true,
  showFullLink = false,
}: SiteDesignPreviewProps) {
  const option = getSiteDesignOption(designId);
  const spec = getSiteDesignPreview(designId);
  const compact = variant === "mini";
  const overlayHeader = spec.headerStyle === "overlay";

  return (
    <div className={variant === "full" ? "space-y-4" : ""}>
      <div
        className={`overflow-hidden bg-white border border-gray-200 shadow-sm ${
          compact ? "rounded-lg" : "rounded-xl"
        } ${variant === "full" ? "max-w-2xl mx-auto" : ""}`}
      >
        <div className={`flex flex-col ${compact ? "h-[140px]" : variant === "full" ? "min-h-[420px]" : "h-[220px]"}`}>
          {!overlayHeader && <PreviewHeader style={spec.headerStyle} />}
          <PreviewHero
            align={spec.heroAlign}
            overlay={overlayHeader}
            brandName={brandName}
            compact={compact}
          />
          <PreviewStats style={spec.statsStyle} compact={compact} />
          <PreviewSections labels={spec.sectionOrder} compact={compact} />
        </div>
      </div>

      {showMeta && !compact && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-bold text-dark">{option.label}</p>
          <p className="text-xs text-gray-500">{option.description}</p>
          <ul className="flex flex-wrap gap-1.5">
            {spec.features.map((f) => (
              <li
                key={f}
                className="text-[10px] px-2 py-0.5 rounded-full bg-orange/10 text-orange font-medium"
              >
                {f}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="text-[10px] text-gray-400">섹션 순서:</span>
            {spec.sectionOrder.map((s, i) => (
              <span key={s} className="text-[10px] text-gray-600">
                {s}
                {i < spec.sectionOrder.length - 1 ? " →" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {showFullLink && (
        <Link
          href={`/admin/design-preview?design=${designId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-orange hover:underline"
        >
          전체 화면 미리보기 ↗
        </Link>
      )}
    </div>
  );
}

interface SiteDesignSelectorProps {
  value: SiteDesignId;
  onChange: (id: SiteDesignId) => void;
  brandName?: string;
}

/** 디자인 선택 + 미리보기 — SITE_DESIGN_OPTIONS 배열 기준 자동 렌더 */
export function SiteDesignSelector({ value, onChange, brandName }: SiteDesignSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {SITE_DESIGN_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`text-left rounded-xl border-2 transition overflow-hidden ${
                selected
                  ? "border-orange bg-orange/5 shadow-sm ring-2 ring-orange/20"
                  : "border-gray-200 hover:border-orange/40"
              }`}
            >
              <div className="p-2 pb-1">
                <SiteDesignPreview
                  designId={option.id}
                  brandName={brandName || SAMPLE_BRAND}
                  variant="mini"
                  showMeta={false}
                />
              </div>
              <div className="px-3 pb-3 pt-1">
                <p className="font-bold text-dark text-sm flex items-center gap-2">
                  {option.label}
                  {selected && (
                    <span className="text-[10px] font-bold text-orange bg-orange/15 px-1.5 py-0.5 rounded">
                      선택됨
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-dark">선택 디자인 미리보기</p>
          <Link
            href={`/admin/design-preview?design=${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-orange hover:underline shrink-0"
          >
            전체 화면 ↗
          </Link>
        </div>
        <SiteDesignPreview
          designId={value}
          brandName={brandName || SAMPLE_BRAND}
          variant="panel"
          showMeta
          showFullLink={false}
        />
      </div>

      <p className="text-xs text-gray-400">
        디자인을 추가하면 목록·미리보기가 자동으로 늘어납니다. 생성 후에도 서브도메인 시드로 문구·이미지 변형이 적용됩니다.
      </p>
    </div>
  );
}
