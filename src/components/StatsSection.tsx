import { getResolvedSiteConfig } from "@/utils/siteConfig";
import { getDefaultStats } from "@/lib/tenant-content";

export default async function StatsSection() {
  const { tenantUi } = await getResolvedSiteConfig();
  const stats = tenantUi?.stats?.length ? tenantUi.stats : getDefaultStats();
  const variant = tenantUi?.designVariant || "classic";

  return (
    <section className={`bg-dark text-white py-12 lg:py-16 tenant-stats-${variant}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 ${
            variant === "bold" ? "divide-x divide-white/10" : ""
          }`}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center animate-count">
              <p className="text-3xl lg:text-4xl font-black text-orange mb-2">
                {stat.value}
                {stat.suffix && (
                  <span className="text-lg lg:text-xl text-white/80">{stat.suffix}</span>
                )}
              </p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
