import { redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import serverAuth from "@edgedb/auth-sveltekit/server";
import { client } from "$lib/server/auth";
import { options } from "$lib/auth";

const authRouteHandlers = {
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

    redirect(303, "/");
  },

  async onSignout() {
    redirect(303, "/");
  },
};

const { createServerRequestAuth, createAuthRouteHook } = serverAuth(
  client,
  options
);

const createServerAuthClient = ({ event, resolve }) => {
  event.locals.auth = createServerRequestAuth(event);

  return resolve(event);
};

export const handle = sequence(
  createServerAuthClient,
  createAuthRouteHook(authRouteHandlers)
);
