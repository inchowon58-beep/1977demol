import { getSiteConfig, phoneToTel } from "@/lib/site-config";
import { showCompanyContact } from "@/lib/exposure-mode";
import InquiryLinkButton from "@/components/InquiryLinkButton";

export default async function CompanyStrip() {
  const site = await getSiteConfig();
  const showCompany = showCompanyContact(site.exposureMode);

  return (
    <section className="bg-dark text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-orange font-semibold mb-1">
              {site.brandName}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
              {site.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {showCompany && (
              <>
                <a
                  href={`tel:${phoneToTel(site.phone)}`}
                  className="text-sm font-bold text-white hover:text-orange transition"
                >
                  📞 {site.phone}
                </a>
                <span className="text-gray-600 hidden sm:inline">|</span>
                <span className="text-sm text-gray-400">{site.address}</span>
              </>
            )}
            <InquiryLinkButton context="header" className="text-sm" />
          </div>
        </div>
      </div>
    </section>
  );
}
