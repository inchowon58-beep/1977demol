import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import FooterWrapper from "@/components/FooterWrapper";
import FixedContactBar from "@/components/FixedContactBar";
import TenantThemeStyles from "@/components/TenantThemeStyles";
import { SiteConfigProvider } from "@/components/SiteConfigProvider";
import { getResolvedSiteConfig } from "@/utils/siteConfig";
import { buildSiteMetadata } from "@/lib/metadata";
import { NAVER_SITE_VERIFICATION } from "@/lib/constants";
import { showCompanyContact } from "@/lib/exposure-mode";

export async function generateMetadata(): Promise<Metadata> {
  const { config, tenant } = await getResolvedSiteConfig();
  const meta = buildSiteMetadata(config);
  if (tenant?.naver_verification) {
    return {
      ...meta,
      other: {
        ...(meta.other || {}),
        "naver-site-verification": tenant.naver_verification,
      },
    };
  }
  return meta;
}

export const viewport: Viewport = {
  themeColor: "#fafafa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { config, tenant, tenantUi, theme } = await getResolvedSiteConfig();
  const showCompany = showCompanyContact(config.exposureMode);
  const naverVerification =
    tenant?.naver_verification?.trim() || NAVER_SITE_VERIFICATION;
  const headerStyle = tenantUi?.headerStyle || "sticky";
  const bodyClasses = [
    "antialiased",
    tenantUi?.designVariant ? `tenant-${tenantUi.designVariant}` : "",
    headerStyle === "overlay" ? "tenant-header-overlay" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const businessJsonLd = showCompany
    ? {
        "@context": "https://schema.org",
        "@type": "HomeAndConstructionBusiness",
        name: config.brandName,
        legalName: config.companyName,
        description: config.description,
        telephone: config.phone,
        email: config.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: config.address,
          addressCountry: "KR",
        },
        founder: {
          "@type": "Person",
          name: config.representative,
        },
        areaServed: {
          "@type": "Country",
          name: "대한민국",
        },
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: config.brandName,
        description: config.description,
        url: config.url,
      };

  return (
    <html lang="ko">
      <head>
        <TenantThemeStyles theme={theme} />
        <meta
          name="naver-site-verification"
          content={naverVerification}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${config.brandName} RSS`}
          href="/feed.xml"
        />
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(businessJsonLd),
          }}
        />
      </head>
      <body className={`${bodyClasses} min-h-screen flex flex-col`}>
        <SiteConfigProvider config={config} tenantUi={tenantUi}>
          {headerStyle !== "hidden" && <Header headerStyle={headerStyle} />}
          <main className="flex-1 pb-24">{children}</main>
          <FooterWrapper />
          <FixedContactBar />
        </SiteConfigProvider>
      </body>
    </html>
  );
}
