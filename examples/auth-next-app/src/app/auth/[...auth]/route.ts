import { auth } from "@/edgedb";
import { redirect } from "next/navigation";

const { GET, POST } = auth.createAuthRouteHandlers({
  onOAuthCallback(err, tokenData, isSignup) {
    console.log(err, tokenData, isSignup);
    redirect("/");
  },
  onSignout() {
    redirect("/");
  },
  onEmailVerify(err, tokenData) {
    console.log(err, tokenData);
    redirect("/");
  },
  onBuiltinUICallback(err, tokenData) {
    console.log(err, tokenData);
    redirect("/");
  },
});

export const dynamic = "force-dynamic";

export { GET, POST };
