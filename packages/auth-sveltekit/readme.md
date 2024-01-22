# @edgedb/auth-sveltekit

This library provides a set of utilities to help you integrate authentication into your [Sveltekit](https://kit.svelte.dev/) application.
It supports authentication with various OAuth providers, as well as email/password authentication.

## Installation

This package is published on npm and can be installed with your package manager of choice.

```bash
npm install @edgedb/auth-sveltekit
```

## Setup

**Prerequisites**: Before adding EdgeDB auth to your Sveltekit app, you will first need to enable the `auth` extension in your EdgeDB schema, and have configured the extension with some providers (you can do this in CLI or EdgeDB UI). Refer to the auth extension docs for details on how to do this.

1. Initialize the client auth helper by passing configuration options to `createClientAuth()`. This will return a `SvelteClientAuth` object which you can use in your components. You can skip this part if you find it unnecessary and provide all your data through the load functions (the next step), but we suggest having the client auth too and use it directly in your components to get OAuth, BuiltinUI and signout URLs.

```ts
// src/lib/auth.ts

import createClientAuth, {
  type SvelteAuthOptions,
} from "@edgedb/auth-sveltekit/client";

export const options: SvelteAuthOptions = {
  baseUrl: "http://localhost:5173",
  // ...
};

const auth = createClientAuth(options);

export default auth;
```

2. Initialize the server auth helper by passing an EdgeDB `Client` object to `createServerAuth()`, along with configuration options. This will return a `SvelteServerAuth` object which you can use across your app on the server side.

   ```ts
   // src/lib/server/auth.ts

   import createServerAuth from "@edgedb/auth-sveltekit/server";
   import { createClient } from "edgedb";
   import { options } from "./auth.client";

   export const client = createClient({
     //Note: when developing locally you will need to set tls  security to insecure, because the dev server uses  self-signed certificates which will cause api calls with the fetch api to fail.
     tlsSecurity: "insecure",
   });

   export const auth = createServerAuth(client, options);
   ```

   The available auth config options are as follows:

   - `baseUrl: string`, _required_, The url of your application; needed for various auth flows (eg. OAuth) to redirect back to.
   - `authRoutesPath?: string`, The path to the auth route handlers, defaults to `'auth'`, see below for more details.
   - `authCookieName?: string`, The name of the cookie where the auth token will be stored, defaults to `'edgedb-session'`.
   - `pkceVerifierCookieName?: string`: The name of the cookie where the verifier for the PKCE flow will be stored, defaults to `'edgedb-pkce-verifier'`
   - `passwordResetUrl?: string`: The url of the the password reset page; needed if you want to enable password reset emails in your app.

3. Setup the auth route handlers, with `auth.createAuthRouteHandlers()`. Callback functions can be provided to handle various auth events, where you can define what to do in the case of successful signin's or errors. You only need to configure callback functions for the types of auth you wish to use in your app.

   ```ts
   // app/routes/auth/[...auth]/+server.ts

   import { redirect } from "@sveltejs/kit";
   import auth from "$lib/server/auth";

   export const GET = auth.createAuthRouteHandlers({
     async onOAuthCallback({ error, tokenData, provider, isSignUp }) {
       redirect(302, "/");
     },
     onSignout() {
       redirect("/");
     },
   });
   ```

The currently available auth handlers are:

- `onOAuthCallback`
- `onBuiltinUICallback`
- `onEmailVerify`
- `onSignout`

By default the handlers expect to exist under the `/routes/auth` path in your app, however if you want to place them elsewhere, you will also need to configure the `authRoutesPath` option of `createServerAuth` to match.

4. Now we just need to setup the UI to allow your users to sign in/up, etc. The easiest way to get started is to use the EdgeDB Auth's builtin UI. Or alternatively you can implement your own custom UI.

   **Builtin UI**

   To use the builtin auth UI, first you will need to enable the UI in the auth ext configuration (see the auth ext docs for details). For the `redirect_to` and `redirect_to_on_signup` configuration options, set them to `{your_app_url}/auth/builtin/callback` and `{your_app_url}/auth/builtin/callback?isSignUp=true` respectively. (Note: if you have setup the auth route handlers under a custom path, replace `auth` in the above url with that path).

   Then you just need to configure the `onBuiltinUICallback` route handler to define what to do once the builtin ui redirects back to your app, and place a link to the builtin UI url returned by `auth.getBuiltinUIUrl()` somewhere in your app.

   **Custom UI**

   To help with implementing your own custom auth UI, the `auth` object has a number of methods you can use:

   - `emailPasswordSignUp`
   - `emailPasswordSignIn`
   - `emailPasswordResendVerificationEmail`
   - `emailPasswordSendPasswordResetEmail`
   - `emailPasswordResetPassword`
   - `signout`
   - `isPasswordResetTokenValid(resetToken: string)`: Checks if a password reset token is still valid.
   - `getOAuthUrl(providerName: string)`: This method takes the name of an OAuth provider (make sure you configure providers you need in the auth ext config first using CLI or EdgeDB UI) and returns a link that will initiate the OAuth sign in flow for that provider. You will also need to configure the `onOAuthCallback` auth route handler.

## Usage

Now you have auth configured and users can signin/signup/etc. You can use the `auth.getSession()` method in server files to retrieve an `AuthSession` object. This session object allows you to check if the user is currently signed in with the `isSignedIn` method, and also provides a `Client` object automatically configured with the `ext::auth::client_token` global, so you can run queries using the `ext::auth::ClientTokenIdentity` of the currently signed in user.

```ts
// src/routes/+page.server.ts
import auth, { client } from "$lib/server/auth";
import { addTodo, deleteTodo, updateTodo } from "$lib/server/database";
import { fail, type Actions } from "@sveltejs/kit";

export async function load({ request }) {
  const session = auth.getSession(request);
  const isSignedIn = await session.isSignedIn();

  return {
    isSignedIn,
  };
}
```

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import clientAuth from "$lib/auth";

  export let data;
</script>

<div>
  {#if data.isSignedIn}
    <h2>You are logged in!</h2>
  {:else}
    <h2>You are not logged in.</h2>
    <a href={clientAuth.getBuiltinUIUrl()}>Sign in with Builtin UI</a>
  {/if}
</div>
```
