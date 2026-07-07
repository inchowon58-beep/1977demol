"use client";

import { WHY_US } from "@/lib/cases";
import { useSiteConfig, useTenantUi } from "@/components/SiteConfigProvider";

export default function WhyUsSection() {
  const site = useSiteConfig();
  const ui = useTenantUi();
  const variant = ui?.designVariant || "classic";
  const items = ui?.whyUsItems?.length ? ui.whyUsItems : WHY_US;

  return (
    <section className={`py-16 lg:py-24 bg-white tenant-why-${variant}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-dark mb-3">
            {site.brandName}가
            <br />
            <span className="text-orange">
              {ui?.whyUsTitle || "합리적인 견적을 제안할 수 있는 이유"}
            </span>
          </h2>
        </div>

        <div
          className={`grid md:grid-cols-3 gap-8 ${
            variant === "modern" ? "md:gap-4" : ""
          }`}
        >
          {items.map((item) => (
            <div
              key={item.num}
              className={`text-center p-8 border border-gray-100 ${
                variant === "bold"
                  ? "rounded-none bg-dark text-white border-dark-light"
                  : variant === "modern"
                    ? "rounded-3xl bg-cream shadow-sm"
                    : "rounded-2xl bg-gray-bg"
              }`}
            >
              <span className="inline-block text-4xl font-black text-orange/30 mb-4">
                {item.num}
              </span>
              <h3
                className={`text-lg font-bold mb-2 ${
                  variant === "bold" ? "text-white" : "text-dark"
                }`}
              >
                {item.title}
              </h3>
              <p className="text-2xl font-black text-orange">{item.highlight}</p>
              <p
                className={`text-sm mt-1 ${
                  variant === "bold" ? "text-gray-300" : "text-gray-500"
                }`}
              >
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
