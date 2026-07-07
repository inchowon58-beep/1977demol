import type { ComponentType } from "react";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import SupportSection from "@/components/SupportSection";
import CasesGallery from "@/components/CasesGallery";
import WhyUsSection from "@/components/WhyUsSection";
import ProcessSection from "@/components/ProcessSection";
import ReviewsSection from "@/components/ReviewsSection";
import PartnerSection from "@/components/PartnerSection";
import CtaSection from "@/components/CtaSection";
import HomeInquirySection from "@/components/HomeInquirySection";
import { getResolvedSiteConfig } from "@/utils/siteConfig";
import {
  DEFAULT_HOME_SECTION_ORDER,
  type HomeSectionId,
} from "@/lib/tenant-content";

const SECTION_MAP: Record<HomeSectionId, ComponentType> = {
  stats: StatsSection,
  support: SupportSection,
  cases: CasesGallery,
  whyUs: WhyUsSection,
  process: ProcessSection,
  reviews: ReviewsSection,
  inquiry: HomeInquirySection,
  partner: PartnerSection,
  cta: CtaSection,
};

export default async function HomeSections() {
  const { tenantUi } = await getResolvedSiteConfig();
  const order = (tenantUi?.sectionOrder as HomeSectionId[] | undefined)?.filter(
    (id): id is HomeSectionId => id in SECTION_MAP
  );

  const sectionOrder = order?.length ? order : DEFAULT_HOME_SECTION_ORDER;
  const hidden = new Set(tenantUi?.hiddenSections || []);

  return (
    <>
      {sectionOrder
        .filter((id) => !hidden.has(id))
        .map((id) => {
          const Section = SECTION_MAP[id];
          return <Section key={id} />;
        })}
    </>
  );
}

export async function HomeLeadBlocks() {
  return <HeroSection />;
}
