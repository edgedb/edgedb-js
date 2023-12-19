import { redirect } from "next/navigation";
import { auth } from "@/edgedb";

export const { GET, POST } = auth.createAuthRouteHandlers({
  async onBuiltinUICallback({ error, tokenData, provider, isSignUp }) {
    if (error) {
      // sign in failed
    }
    if (!tokenData) {
      // email requires validation
    }
    if (isSignUp) {
      // create user
    }
    redirect("/");
  },
  onSignout() {
    redirect("/");
  },
});
