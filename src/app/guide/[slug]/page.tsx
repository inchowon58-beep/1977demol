import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getPageByKey } from "@/lib/data";
import { guidePageUrl } from "@/lib/constants";
import { buildPageMetadata, getOgImageAbsoluteUrl } from "@/lib/metadata";
import { buildDefaultFaqs } from "@/lib/gemini";
import {
  getSiteConfig,
  resolveSeoPage,
  phoneToTel,
} from "@/lib/site-config";
import { getRelatedPages } from "@/lib/related-pages";
import RelatedPagesSection from "@/components/RelatedPagesSection";
import LocalPartnersSection from "@/components/LocalPartnersSection";
import { ensureLocalPartners } from "@/lib/seo-local-partners";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [page, config] = await Promise.all([getPageByKey(slug), getSiteConfig()]);
  if (!page) return { title: "페이지를 찾을 수 없습니다" };

  const resolved = resolveSeoPage(page, config);
  return buildPageMetadata(config, {
    title: resolved.title,
    description: resolved.description,
    path: guidePageUrl(page.slug),
    ogPath: `/guide/${page.slug}/opengraph-image`,
    type: "article",
    keywords: [page.keyword, "폐업철거", config.brandName],
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const [page, config] = await Promise.all([getPageByKey(slug), getSiteConfig()]);
  if (!page) notFound();

  const resolved = resolveSeoPage(page, config);
  const relatedPages = await getRelatedPages(page.slug, config, 5);
  const { region: localRegion, partners: localPartners } = await ensureLocalPartners(
    page,
    config
  );
  const faqs =
    resolved.faqs?.length >= 3
      ? resolved.faqs.slice(0, 3)
      : buildDefaultFaqs(page.keyword, config).map((f) => ({
          question: f.question,
          answer: f.answer
            .replace(/\{\{brandName\}\}/g, config.brandName)
            .replace(/\{\{phone\}\}/g, config.phone)
            .replace(/\{\{supportMax\}\}/g, config.supportMax),
        }));

  const brandShort = config.brandName.replace(/철거$/, "") || "19";

  return (
    <article className="bg-cream min-h-screen">
      <div className="bg-dark text-white py-8">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange flex-shrink-0 bg-orange flex items-center justify-center">
            <span className="text-xl font-black">{brandShort}</span>
          </div>
          <div>
            <p className="font-bold">{config.brandName}</p>
            <p className="text-sm text-gray-300">{config.companyName}</p>
            <p className="text-sm text-orange">폐업철거 전문 · 폐업지원금 원스톱</p>
          </div>
        </div>
      </div>

      <div className="relative h-64 lg:h-80">
        <Image
          src={resolved.imageUrl}
          alt={page.keyword}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block bg-orange text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              {page.keyword}
            </span>
            <h1 className="text-2xl lg:text-4xl font-bold text-white">
              {resolved.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 lg:py-16">
        <div
          className="prose-seo bg-white rounded-2xl p-6 lg:p-10 shadow-sm"
          dangerouslySetInnerHTML={{ __html: resolved.content }}
        />

        <div className="mt-10 bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-dark mb-6">자주 묻는 질문</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-gray-100 bg-gray-bg/50 open:bg-white open:shadow-sm transition"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-dark flex items-center justify-between gap-4">
                  <span>{faq.question}</span>
                  <span className="text-orange text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <RelatedPagesSection pages={relatedPages} brandName={config.brandName} />

        {localRegion && (
          <LocalPartnersSection
            region={localRegion}
            partners={localPartners}
            brandName={config.brandName}
          />
        )}

        <div className="mt-10 text-center bg-dark rounded-2xl p-8 text-white">
          <h2 className="text-xl font-bold mb-3">{page.keyword} 상담</h2>
          <p className="text-gray-300 mb-6 text-sm">
            {config.brandName} · 무료 방문 견적 · 폐업지원금 최대 {config.supportMax}
          </p>
          <a
            href={`tel:${phoneToTel(config.phone)}`}
            className="inline-flex items-center gap-2 bg-orange text-white font-bold px-6 py-3 rounded-full hover:bg-orange-light transition"
          >
            무료 상담 신청 {config.phone}
          </a>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: resolved.title,
            description: resolved.description,
            image: getOgImageAbsoluteUrl(config, `/guide/${page.slug}/opengraph-image`),
            author: {
              "@type": "Organization",
              name: config.companyName,
            },
            publisher: {
              "@type": "Organization",
              name: config.brandName,
            },
          }),
        }}
      />
      {localPartners.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `${localRegion || page.keyword} 인테리어 관련 업체`,
              itemListElement: localPartners.map((partner, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "LocalBusiness",
                  name: partner.name,
                  address: partner.address,
                  url: partner.placeUrl,
                },
              })),
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />
    </article>
  );
}
