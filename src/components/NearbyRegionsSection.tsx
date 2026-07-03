import Link from "next/link";
import type { NearbyRegionLink } from "@/lib/nearby-regions";

interface Props {
  regions: NearbyRegionLink[];
}

export default function NearbyRegionsSection({ regions }: Props) {
  if (regions.length === 0) return null;

  return (
    <section className="mt-10 bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
      <h2 className="text-xl font-bold text-dark mb-4">근방 지역</h2>
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
