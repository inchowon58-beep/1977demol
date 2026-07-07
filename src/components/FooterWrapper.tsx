import Footer from "@/components/Footer";
import { isAuthenticated } from "@/lib/auth";
import type { FooterStyle } from "@/lib/tenant-content";

export default async function FooterWrapper({
  footerStyle = "full",
}: {
  footerStyle?: FooterStyle;
}) {
  const loggedIn = await isAuthenticated();
  return <Footer isLoggedIn={loggedIn} footerStyle={footerStyle} />;
}
