import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import InquiriesClient from "./InquiriesClient";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return buildPageMetadata(config, {
    title: "견적 문의 DB",
    description: `${config.brandName} 견적 문의 관리`,
    path: "/admin/inquiries",
    noIndex: true,
  });
}

export default async function InquiriesPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/");
  return <InquiriesClient />;
}
