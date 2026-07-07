import type { Metadata } from "next";
import HomeSections, { HomeLeadBlocks } from "@/components/HomeSections";
import { getSiteConfig } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return buildPageMetadata(config, {
    title: `${config.brandName} | 폐업철거 전문 · 폐업지원금 원스톱`,
    description: config.description,
    path: "/",
    ogPath: "/opengraph-image",
  });
}

export default function HomePage() {
  return (
    <>
      <HomeLeadBlocks />
      <HomeSections />
    </>
  );
}
