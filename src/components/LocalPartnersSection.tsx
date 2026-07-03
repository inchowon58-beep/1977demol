import ExternalLink from "@/components/ExternalLink";
import type { LocalPartner } from "@/lib/data";

interface Props {
  region: string;
  partners: LocalPartner[];
  brandName: string;
}

export default function LocalPartnersSection({ region, partners, brandName }: Props) {
  if (partners.length === 0) return null;

  return (
    <section className="mt-10 bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
      <h2 className="text-xl font-bold text-dark mb-2">
        {region} 인테리어·철거 관련 업체
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {region} 지역 타일·도배·장판·철물 관련 업체 정보입니다. {brandName} 철거 후
        마감 공사 상담 시 참고하실 수 있습니다. (출처: 네이버 지도)
      </p>
      <ul className="space-y-4">
        {partners.map((partner) => (
          <li
            key={`${partner.type}-${partner.name}`}
            className="rounded-xl border border-gray-100 p-5 hover:border-orange/30 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-block text-xs font-bold text-orange bg-orange/10 px-2.5 py-1 rounded-full mb-2">
                  {region}
                  {partner.type}
                </span>
                <h3 className="font-bold text-dark text-base mb-1">
                  <ExternalLink
                    href={partner.placeUrl}
                    className="hover:text-orange transition underline-offset-2 hover:underline"
                  >
                    {partner.name}
                  </ExternalLink>
                </h3>
                <p className="text-sm text-gray-600">📍 {partner.address}</p>
              </div>
              <ExternalLink
                href={partner.placeUrl}
                className="shrink-0 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-orange border border-orange rounded-lg hover:bg-orange hover:text-white transition"
              >
                네이버 플레이스
              </ExternalLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
