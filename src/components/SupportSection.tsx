import Image from "next/image";
import Link from "next/link";
import { getSiteConfig, phoneToTel } from "@/lib/site-config";
import { getImageUrl } from "@/lib/site-images";
import { INQUIRY_SECTION_ID, inquiryAccentButtonClass, showCompanyContact } from "@/lib/exposure-mode";
import { getResolvedSiteConfig } from "@/utils/siteConfig";

export default async function SupportSection() {
  const site = await getSiteConfig();
  const showCompany = showCompanyContact(site.exposureMode);
  const { tenantUi } = await getResolvedSiteConfig();
  const supportBlurb =
    tenantUi?.supportBlurb ||
    "지원금 범위 안에서 철거 공사를 계획할 수 있도록 신청부터 시공까지 전 과정을 함께 진행합니다.";

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-dark mb-6 leading-tight">
              폐업지원금 <span className="text-orange">{site.supportBase}</span>
              <br />
              + 추가 지원 <span className="text-orange">{site.supportExtra}</span>
            </h2>
            <p className="text-xl font-bold text-dark mb-4">
              합산 최대 <span className="text-orange text-2xl">{site.supportMax}</span> 상담
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">{supportBlurb}</p>
            <p className="text-sm text-gray-400">
              *지역·업종·평수에 따라 지원 금액이 달라질 수 있습니다. 시공 전 상담을 권장합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {showCompany && (
                <a
                  href={`tel:${phoneToTel(site.phone)}`}
                  className="inline-flex items-center gap-2 bg-orange text-white font-bold px-6 py-3 rounded-full hover:bg-orange-light transition"
                >
                  지원금·견적 상담
                </a>
              )}
              <Link
                href={`/#${INQUIRY_SECTION_ID}`}
                className={`inline-flex items-center gap-2 font-bold px-6 py-3 rounded-full transition ${inquiryAccentButtonClass(site.exposureMode)}`}
              >
                {showCompany ? "3초 견적문의" : "3초 견적신청 문의하기"}
              </Link>
            </div>
          </div>

          <div className="relative h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl">
            <Image
              src={getImageUrl(tenantUi?.supportImageIndex || 3, site)}
              alt="폐업지원금 안내"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-2">많은 사업자분들이 선택하는 이유</p>
          <h3 className="text-2xl font-bold text-dark">
            전국 폐업철거 파트너 <span className="text-orange">{site.brandName}</span>
          </h3>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            철거 업체 사기 피해 사례가 늘고 있습니다.
            {site.brandName}는 지원금 신청부터 철거·원상복구까지 책임지고 진행합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
