import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import TenantSiteEditClient from "./TenantSiteEditClient";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "사이트 수정",
    robots: { index: false, follow: false, nocache: true, noimageindex: true },
  };
}

export default async function TenantSiteEditPage({ params }: PageProps) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/");

  const master = await isMasterAuthenticated();
  if (!master) redirect("/admin/master");

  const { id } = await params;
  return <TenantSiteEditClient siteId={id} />;
}
