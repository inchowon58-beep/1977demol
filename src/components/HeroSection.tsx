import Image from "next/image";
import Link from "next/link";
import { getSiteConfig, phoneToTel } from "@/lib/site-config";
import { getImageUrl } from "@/lib/site-images";
import { INQUIRY_SECTION_ID, inquiryAccentButtonClass, showCompanyContact } from "@/lib/exposure-mode";

export default async function HeroSection() {
  const site = await getSiteConfig();
  const showCompany = showCompanyContact(site.exposureMode);
  const { getResolvedSiteConfig } = await import("@/utils/siteConfig");
  const { tenant, tenantUi } = await getResolvedSiteConfig();
  const ui = tenantUi ?? tenant?.content_data;

  const badge = ui?.heroBadge || "폐업 철거, 부담 없이 마무리";
  const intro = ui?.heroIntro || "폐업지원금 신청부터 철거·원상복구까지";
  const closing = ui?.heroClosing || "가 한 번에 해결합니다";
  const variant = ui?.designVariant || "classic";

  return (
    <section
      id="about"
      className={`hero-section relative min-h-[85vh] flex items-center overflow-hidden tenant-hero-${variant}`}
    >
      <Image
        src={getImageUrl(ui?.heroImageIndex || 1, site)}
        alt={`${site.brandName} 폐업철거 전문`}
        fill
        className="object-cover"
        priority
      />
      <div className="hero-overlay absolute inset-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className={`max-w-2xl ${variant === "modern" ? "lg:ml-auto lg:text-right" : ""}`}>
          <span className="hero-badge inline-block bg-orange text-white text-sm font-bold px-4 py-1.5 rounded-full mb-6">
            {badge}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
            {site.tagline}
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 mb-8 leading-relaxed">
            {intro}
            <br />
            <strong className="text-orange">{site.brandName}</strong>
            {closing}
          </p>

          <div className={`flex flex-wrap gap-3 ${variant === "modern" ? "lg:justify-end" : ""}`}>
            {showCompany && (
              <a
                href={`tel:${phoneToTel(site.phone)}`}
                className="inline-flex items-center gap-2 bg-orange text-white font-bold px-8 py-4 rounded-full hover:bg-orange-light transition shadow-lg text-lg"
              >
                무료 상담 전화하기
              </a>
            )}
            <Link
              href={`/#${INQUIRY_SECTION_ID}`}
              className={`inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full transition shadow-lg text-lg ${
                showCompany
                  ? `${inquiryAccentButtonClass(site.exposureMode)} border border-white/20`
                  : inquiryAccentButtonClass(site.exposureMode)
              }`}
            >
              {showCompany ? "3초 견적문의" : "3초 빠른문의 신청하기"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
