import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import FooterWrapper from "@/components/FooterWrapper";
import FixedContactBar from "@/components/FixedContactBar";
import { SiteConfigProvider } from "@/components/SiteConfigProvider";
import { getSiteConfig } from "@/lib/site-config";
import { buildSiteMetadata } from "@/lib/metadata";
import { NAVER_SITE_VERIFICATION } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return buildSiteMetadata(config);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();

  return (
    <html lang="ko">
      <head>
        <meta
          name="naver-site-verification"
          content={NAVER_SITE_VERIFICATION}
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
            __html: JSON.stringify({
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
            }),
          }}
        />
      </head>
      <body className="antialiased">
        <SiteConfigProvider config={config}>
          <Header />
          <main className="pb-24">{children}</main>
          <FooterWrapper />
          <FixedContactBar />
        </SiteConfigProvider>
      </body>
    </html>
  );
}
