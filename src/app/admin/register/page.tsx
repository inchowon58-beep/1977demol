import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import RegisterSiteClient from "./RegisterSiteClient";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return buildPageMetadata(config, {
    title: "신규 사이트 등록",
    description: "멀티 테넌트 사이트 자동 생성",
    path: "/admin/register",
    noIndex: true,
  });
}

export default async function RegisterSitePage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/");

  const master = await isMasterAuthenticated();
  if (!master) redirect("/admin/master");

  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">불러오는 중...</div>}>
      <RegisterSiteClient />
    </Suspense>
  );
}
