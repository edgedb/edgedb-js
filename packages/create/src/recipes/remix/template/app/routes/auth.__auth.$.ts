import { redirect } from "@remix-run/node";
import auth from "~/services/auth.server";

export const { loader } = auth.createAuthRouteHandlers({
  async onBuiltinUICallback({ error, tokenData, isSignUp }) {
    if (error) {
      //
    }

    if (!tokenData) {
      //
    }

    if (isSignUp) {
      //
    }

    redirect("/");
  },

  async onSignout() {
    return redirect("/");
  },
});
