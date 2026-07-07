"use client";

import { useState } from "react";
import Link from "next/link";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import InquiryLinkButton from "@/components/InquiryLinkButton";
import { showCompanyContact } from "@/lib/exposure-mode";
import type { HeaderStyle } from "@/lib/tenant-content";

const NAV_ITEMS = [
  { href: "/#about", label: "소개" },
  { href: "/#cases", label: "시공사례" },
  { href: "/#process", label: "진행절차" },
  { href: "/#reviews", label: "고객후기" },
  { href: "/#quick-inquiry", label: "견적문의" },
] as const;

interface HeaderProps {
  headerStyle?: HeaderStyle;
}

export default function Header({ headerStyle = "sticky" }: HeaderProps) {
  const site = useSiteConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const showCompany = showCompanyContact(site.exposureMode);
  const isOverlay = headerStyle === "overlay";
  const isMinimal = headerStyle === "minimal";

  const closeMenu = () => setMenuOpen(false);

  const headerClass =
    headerStyle === "overlay"
      ? "absolute top-0 left-0 right-0 z-50 bg-transparent border-b border-white/10"
      : headerStyle === "minimal"
        ? "sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm"
        : "sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm";

  const brandClass = isOverlay
    ? "font-black text-white text-lg lg:text-xl leading-tight group-hover:text-orange transition"
    : "font-black text-dark text-xl lg:text-2xl leading-tight group-hover:text-orange transition";

  const taglineClass = isOverlay
    ? "text-[10px] sm:text-xs text-gray-200 leading-tight mt-0.5"
    : "text-[11px] sm:text-xs text-gray-500 leading-tight mt-0.5";

  const navLinkClass = isOverlay
    ? "text-sm font-medium text-gray-100 hover:text-orange whitespace-nowrap transition"
    : "text-sm font-medium text-gray-600 hover:text-orange whitespace-nowrap transition";

  const visibleNav = isMinimal ? NAV_ITEMS.slice(0, 3) : NAV_ITEMS;

  return (
    <header className={headerClass}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isMinimal ? "" : ""}`}>
        <div
          className={`flex items-center justify-between gap-4 ${
            isMinimal ? "h-14" : "h-16 lg:h-20"
          }`}
        >
          <Link href="/" className="shrink-0 group" onClick={closeMenu}>
            <p className={brandClass}>{site.brandName}</p>
            <p className={taglineClass}>{site.tagline}</p>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
            {visibleNav.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {showCompany && (
              <a
                href={`tel:${site.phoneTel}`}
                className="px-5 py-2.5 bg-orange text-white text-sm font-bold rounded-full hover:bg-orange-light transition"
              >
                전화 상담 {site.phone}
              </a>
            )}
            <InquiryLinkButton context="header" />
          </div>

          <div className="flex items-center shrink-0 lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-dark hover:bg-gray-50 transition"
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-orange hover:bg-gray-50 rounded-xl transition"
              >
                {item.label}
              </Link>
            ))}
            <div className="mx-4 mt-2 flex flex-col gap-2">
              {showCompany && (
                <a
                  href={`tel:${site.phoneTel}`}
                  onClick={closeMenu}
                  className="py-3 text-center bg-orange text-white font-bold rounded-xl"
                >
                  전화연결 {site.phone}
                </a>
              )}
              <InquiryLinkButton
                context="header"
                onClick={closeMenu}
                className="w-full text-center rounded-xl"
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
