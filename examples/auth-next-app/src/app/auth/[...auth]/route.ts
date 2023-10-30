import { auth } from "@/edgedb";
import { redirect } from "next/navigation";

const { GET, POST } = auth.createAuthRouteHandlers({
  onOAuthCallback({ error, tokenData, isSignUp }) {
    console.log(error, tokenData, isSignUp);
    redirect("/");
  },
  onSignout() {
    redirect("/");
  },
  onEmailVerify({ error, tokenData }) {
    console.log(error, tokenData);
    redirect("/");
  },
  onBuiltinUICallback({ error, tokenData }) {
    console.log(error, tokenData);
    redirect("/");
  },
});

export const dynamic = "force-dynamic";

export { GET, POST };
