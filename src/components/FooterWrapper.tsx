import Footer from "@/components/Footer";
import { isAuthenticated } from "@/lib/auth";

export default async function FooterWrapper() {
  const loggedIn = await isAuthenticated();
  return <Footer isLoggedIn={loggedIn} />;
}
