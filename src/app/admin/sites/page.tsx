import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import TenantSitesClient from "./TenantSitesClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "등록 사이트 목록",
    robots: { index: false, follow: false, nocache: true, noimageindex: true },
  };
}

export default async function TenantSitesPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/");

  const master = await isMasterAuthenticated();
  if (!master) redirect("/admin/master");

  return <TenantSitesClient />;
}
