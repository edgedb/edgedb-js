# @edgedb/auth-nextjs: Helper library to integrate the EdgeDB Auth extension with Next.js

> Warning: This library is still in an alpha state, and so, bugs are likely and the api's should be considered unstable and may change in future releases.

## Setup

**Prerequisites**:
- Node v18+
  - **Note**: Due to using the `crypto` global, you will need to start Node with `--experimental-global-webcrypto`. You can add this option to your `NODE_OPTIONS` environment variable, like `NODE_OPTIONS='--experimental-global-webcrypto'` in the appropriate `.env` file.

### EdgeDB Auth Setup

Before adding EdgeDB auth to your Next.js app, you will first need to enable the `auth` extension in your EdgeDB schema, and have configured the extension with some providers.

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

### Initialize EdgeDB Auth Helper

Initialize the auth helper by passing an EdgeDB `Client` object to `createAuth()`, along with some configuration options. This will return a `NextAppAuth` object which you can use across your app. Similarly to the `Client` it's recommended to export this auth object from some root configuration file in your app.

   ```ts
   // edgedb.ts

   import { createClient } from "edgedb";
   import createAuth from "@edgedb/auth-nextjs/app";

   export const client = createClient();

   export const auth = createAuth(client, {
     baseUrl: "http://localhost:3000",
   });
   ```

   The available auth config options are as follows:

   - `baseUrl: string`, _required_, The url of your application; needed for various auth flows (eg. OAuth) to redirect back to.
   - `authRoutesPath?: string`, The path to the auth route handlers, defaults to `'auth'`, see below for more details.
   - `authCookieName?: string`, The name of the cookie where the auth token will be stored, defaults to `'edgedb-session'`.
   - `pkceVerifierCookieName?: string`: The name of the cookie where the verifier for the PKCE flow will be stored, defaults to `'edgedb-pkce-verifier'`
   - `passwordResetPath?: string`: The path relative to the `baseUrl` of the the password reset page; needed if you want to enable password reset emails in your app.
   - `magicLinkFailurePath?: string`: The path relative to the `baseUrl` of the page we should redirect users to if there is an error when trying to sign in with a magic link. The page will get an `error` search parameter attached with an error message. This property is required if you use the Magic Link authentication feature.

### Auth Route Handlers Setup

Setup the auth route handlers, with `auth.createAuthRouteHandlers()`. Callback functions can be provided to handle various auth events, where you can define what to do in the case of successful signin's or errors. You only need to configure callback functions for the types of auth you wish to use in your app.

   ```ts
   // app/auth/[...auth]/route.ts

   import { redirect } from "next/navigation";
   import { auth } from "@/edgedb";

   const { GET, POST } = auth.createAuthRouteHandlers({
     onOAuthCallback({ error, tokenData, isSignUp }) {
       redirect("/");
     },
     onSignout() {
       redirect("/");
     },
   });

   export { GET, POST };
   ```

   The currently available auth handlers are:

   - `onOAuthCallback`
   - `onEmailPasswordSignIn`
   - `onEmailPasswordSignUp`
   - `onEmailPasswordReset`
   - `onEmailVerify`
   - `onBuiltinUICallback`
   - `onWebAuthnSignIn`
   - `onWebAuthnSignUp`
   - `onMagicLinkCallback`
   - `onSignout`

   By default the handlers expect to exist under the `/auth` path in your app, however if you want to place them elsewhere, you will also need to configure the `authRoutesPath` option of `createAuth` to match.

### UI Setup

Now we need to setup the UI to allow your users to sign in/up, etc. The easiest way to get started is to use the EdgeDB Auth's builtin UI. Or alternatively you can implement your own custom UI.

   **Builtin UI**

   To use the builtin auth UI, first you will need to enable the UI in the auth ext configuration (see the auth ext docs for details). For the `redirect_to` and `redirect_to_on_signup` configuration options, set them to `{your_app_url}/auth/builtin/callback` and `{your_app_url}/auth/builtin/callback?isSignUp=true` respectively. (Note: if you have setup the auth route handlers under a custom path, replace 'auth' in the above url with that path).

   Then you just need to configure the `onBuiltinUICallback` handler to define what to do once the builtin ui redirects back to your app, and place a link to the builtin UI url returned by `auth.auth.getBuiltinUIUrl()` where you want to in app.

   **Custom UI**

   To help with implementing your own custom auth UI, the `Auth` object has a number of methods you can use:

   - `getOAuthUrl(providerName: string)`: This method takes the name of an OAuth provider (make sure you configure that ones you need in the auth ext config first) and returns a link that will initiate the OAuth sign in flow for that provider. You will also need to configure the `onOAuthCallback` auth route handler.
   - `createServerActions()`: Returns a number of server actions that you can use in your UI:
     - `emailPasswordSignIn`
     - `emailPasswordSignUp`
     - `emailPasswordSendPasswordResetEmail`
     - `emailPasswordResetPassword`
     - `emailPasswordResendVerificationEmail`
     - `magicLinkSignUp`
     - `magicLinkSignIn`
     - `signout`
   - `isPasswordResetTokenValid(resetToken: string)`: Checks if a password reset token is still valid.

## Usage

Now you have auth all configured and user's can signin/signup/etc. you can use the `auth.getSession()` method in your app pages to retrieve an `AuthSession` object. This session object allows you to check if the user is currently logged in with the `isSignedIn` method, and also provides a `Client` object automatically configured with the `ext::auth::client_token` global, so you can run queries using the `ext::auth::ClientTokenIdentity` of the currently signed in user.

```ts
import { auth } from "@/edgedb";

export default async function Home() {
  const session = await auth.getSession();

  const isSignedIn = await session.isSignedIn();

  return (
    <main>
      <h1>Home</h1>

      {isSignedIn ? (
        <>
          <div>You are signed in</div>
          {await session.client.queryJSON(`...`)}
        </>
      ) : (
        <>
          <div>You are not signed in</div>
          <a href={auth.getBuiltinUIUrl()}>Sign in with Built-in UI</a>
        </>
      )}
    </main>
  );
}
```
