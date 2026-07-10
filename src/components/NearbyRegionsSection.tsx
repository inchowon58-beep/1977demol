import Link from "next/link";
import type { NearbyRegionLink } from "@/lib/nearby-regions";
import { normalizeCityKey } from "@/lib/sub-region-map";

interface Props {
  cityLabel: string | null;
  regions: NearbyRegionLink[];
}

export default function NearbyRegionsSection({ cityLabel, regions }: Props) {
  if (regions.length === 0) return null;

  const title = cityLabel
    ? `${normalizeCityKey(cityLabel) || cityLabel} 인근 지역`
    : "근방 지역";

  return (
    <section className="mt-10 bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
      <h2 className="text-xl font-bold text-dark mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">
        같은 지역 안에서 자주 찾는 동·읍·면입니다.
      </p>
      <ul className="flex flex-wrap gap-2">
        {regions.map((item) => (
          <li key={item.region}>
            {item.href ? (
              <Link
                href={item.href}
                className="inline-block px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-dark hover:border-orange hover:text-orange transition"
              >
                {item.region}
              </Link>
            ) : (
              <span className="inline-block px-4 py-2 rounded-full border border-gray-100 bg-gray-bg text-sm font-medium text-gray-600">
                {item.region}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
