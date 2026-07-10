import Link from "next/link";
import type { RelatedKeywordPageLink } from "@/lib/related-keyword-pages";

interface Props {
  links: RelatedKeywordPageLink[];
}

export default function RelatedKeywordPagesSection({ links }: Props) {
  if (links.length === 0) return null;

  return (
    <section className="mt-10 bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
      <h2 className="text-xl font-bold text-dark mb-1">다른 지역 철거·폐업철거 안내</h2>
      <p className="text-xs text-gray-500 mb-4">
        관련 키워드 페이지 {links.length}개 — 좌우로 스크롤하여 보실 수 있습니다.
      </p>
      <div className="relative -mx-1">
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:thin]">
          {links.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="snap-start shrink-0 inline-flex items-center px-4 py-2.5 rounded-full border border-gray-200 bg-gray-bg/40 text-sm font-medium text-dark hover:border-orange hover:bg-orange/5 hover:text-orange transition whitespace-nowrap max-w-[240px] truncate"
              title={item.keyword}
            >
              {item.keyword}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
