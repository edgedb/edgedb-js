# @edgedb/auth-remix

This library provides a set of utilities to help you integrate authentication into your [Remix](https://remix.run/) application.
It supports authentication with various OAuth providers, as well as email/password authentication.

## Installation

This package is published on npm and can be installed with your package manager of choice.

```bash
npm install @edgedb/auth-remix
```

## Setup

**Prerequisites**:
- Node v18+
  - **Note**: Due to using the `crypto` global, you will need to start Node with `--experimental-global-webcrypto`. You can add this option to your `NODE_OPTIONS` environment variable, like `NODE_OPTIONS='--experimental-global-webcrypto'` in the appropriate `.env` file.

### EdgeDB Auth Setup

Before adding EdgeDB auth to your Remix app, you will first need to enable the `auth` extension in your EdgeDB schema, and have configured the extension with some providers.

1. Enable the EdgeDB Auth extension in your schema:
   
   Add the following to your EdgeDB schema:

   ```esdl
   using extension auth;
   ```

  Once added, make sure to apply the schema changes by migrating your database schema:

  ```sh
  $ edgedb migration create
  $ edgedb migrate
  ```

2. Configure EdgeDB Auth settings:

  Next, you'll need to configure the EdgeDB Auth extension. This involves setting up essential parameters, such as signing keys and allowed redirect URLs.

  _Below, we're showing how to set up the EdgeDB authentication using EdgeQL queries. To run these commands, you need to start the EdgeDB instance first (`edgedb`). Alternatively, you can use the EdgeDB UI (`edgedb ui`) to configure the authentication settings interactively._

  **Signing Key** 
  
  This key is used to sign JWT tokens. You can generate one using OpenSSL:

  ```sh
  $ openssl rand -base64 32
  ```

  Once generated, configure the signing key in EdgeDB:

  ```esdl
  CONFIGURE CURRENT BRANCH SET
  ext::auth::AuthConfig::auth_signing_key := '<your-generated-key>';
  ```

  **Allowed Redirect URLs**

  This setting ensures that redirects are limited to the URLs under your control. Configure the allowed URLs with the following command:

  ```esdl
  CONFIGURE CURRENT BRANCH SET
  ext::auth::AuthConfig::allowed_redirect_urls := {
      'http://localhost:3000',
      'https://example.trycloudflare.com',
      'https://example.ngrok.io',
  };
  ```

  **Authentication providers**

  You need to configure at least one authentication provider. For example, to add an email/password provider, use the following command:

  ```esdl
  CONFIGURE CURRENT BRANCH
  INSERT ext::auth::EmailPasswordProviderConfig {
      require_verification := false
  };
  ```

  > [!CAUTION]
  > In production environments, it is recommended to set require_verification to true to ensure users verify their email addresses.

  **SMTP for email verification (optional)**

  If using the email/password provider, you need to configure SMTP for email verification and password reset emails. Here's an example using a local SMTP server like Mailpit for development purposes:

  ```esdl
  CONFIGURE CURRENT BRANCH SET
  ext::auth::SMTPConfig::sender := 'hello@example.com';

  CONFIGURE CURRENT BRANCH SET
  ext::auth::SMTPConfig::host := 'localhost';

  CONFIGURE CURRENT BRANCH SET
  ext::auth::SMTPConfig::port := <int32>1025;

  CONFIGURE CURRENT BRANCH SET
  ext::auth::SMTPConfig::security := 'STARTTLSOrPlainText';

  CONFIGURE CURRENT BRANCH SET
  ext::auth::SMTPConfig::validate_certs := false;
  ```

### Initialize Client Auth Helper

Initialize the client auth helper by passing configuration options to `createClientAuth()`. This will return a `RemixClientAuth` object which you can use in your components. You can skip this part if you find it unnecessary and provide all your data through the loader (the next step), but we suggest having the client auth too and use it directly in your components to get OAuth, BuiltinUI and signout URLs.

```ts
// app/services/auth.ts

import createClientAuth, {
  type RemixAuthOptions,
} from "@edgedb/auth-remix/client";

export const options: RemixAuthOptions = {
  baseUrl: "http://localhost:3000",
  // ...
};

const auth = createClientAuth(options);

export default auth;
```

### Initialize Server Auth Helper

Initialize the server auth helper by passing an EdgeDB `Client` object to `createServerAuth()`, along with configuration options. This will return a `RemixServerAuth` object which you can use across your app on the server side.

   ```ts
   // app/services/auth.server.ts

   import createServerAuth from "@edgedb/auth-remix/server";
   import { createClient } from "edgedb";
   import { options } from "./auth";

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

### Auth Route Handlers Setup

Setup the auth route handlers, with `auth.createAuthRouteHandlers()`. Callback functions can be provided to handle various auth events, where you can define what to do in the case of successful signin's or errors. You only need to configure callback functions for the types of auth you wish to use in your app.

   ```ts
   // app/routes/auth.$.ts

   import { redirect } from "@remix-run/node";
   import auth from "~/services/auth.server";

   export const { loader } = auth.createAuthRouteHandlers({
     async onOAuthCallback({ error, tokenData, provider, isSignUp }) {
       return redirect("/");
     },
     async onSignout() {
       return redirect("/");
     },
   });
   ```

   The currently available auth handlers are:

   - `onOAuthCallback`
   - `onBuiltinUICallback`
   - `onEmailVerify`
   - `onSignout`

   By default the handlers expect to exist under the `/routes/auth` path in your app, however if you want to place them elsewhere, you will also need to configure the `authRoutesPath` option of `createServerAuth` to match.

### UI Setup

Now we just need to setup the UI to allow your users to sign in/up, etc. The easiest way to get started is to use the EdgeDB Auth's builtin UI. Or alternatively you can implement your own custom UI.

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

Now you have auth all configured and user's can signin/signup/etc. you can use the `auth.getSession()` method in your app pages to retrieve an `AuthSession` object. This session object allows you to check if the user is currently signed in with the `isSignedIn` method, and also provides a `Client` object automatically configured with the `ext::auth::client_token` global, so you can run queries using the `ext::auth::ClientTokenIdentity` of the currently signed in user.

```ts
// app/routes/_index.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";

import auth, { client } from "~/services/auth.server";
import clientAuth from "~/services/auth.client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = auth.getSession(request);
  const isSignedIn = await session.isSignedIn();

  return json({
    isSignedIn,
  });
};

export default function Index() {
  const { isSignedIn } = useLoaderData<typeof loader>();

  return (
    <main>
      <h1>Home</h1>
      {isSignedIn ? (
        <h2>You are logged in</h2>
      ) : (
        <>
          <h2>You are not logged in</h2>
          <Link to={clientAuth.getBuiltinUIUrl()}>Sign in with Builtin UI</Link>
        </>
      )}
    </main>
  );
}
```
