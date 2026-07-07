import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAuthenticated, isMasterAuthenticated } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import DesignPreviewClient from "./DesignPreviewClient";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return buildPageMetadata(config, {
    title: "디자인 미리보기",
    description: "사이트 디자인 템플릿 미리보기",
    path: "/admin/design-preview",
    noIndex: true,
  });
}

export default async function DesignPreviewPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/");

  const master = await isMasterAuthenticated();
  if (!master) redirect("/admin/master");

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
          미리보기 불러오는 중...
        </div>
      }
    >
      <DesignPreviewClient />
    </Suspense>
  );
}
