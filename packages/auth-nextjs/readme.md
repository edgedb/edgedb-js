# `@edgedb/auth-nextjs`: Helper library to integrate the EdgeDB Auth extension with Next.js

> Warning: This library is still in beta, and so, bugs are likely and the api's should be considered unstable and may change in future releases.

This library contains a collection of api route handlers, servers actions, and a session api, to help easily integrate EdgeDB Auth into your Next.js app. The library provides separate exports to integrate with both the Next.js pages router api, and app router api.

## Setup

**Prerequisites**: Before adding EdgeDB auth to your Next.js app, you will first need to enable the `auth` extension in your EdgeDB schema, and have configured the extension with some providers. Refer to the auth extension docs for details on how to do this.

### 1. Initialize the auth helper

To initialize the auth helper library pass an EdgeDB `Client` object to `createAuth()`, along with some configuration options. This will return a `NextAppAuth` object which you can use across your app. Similarly to the `Client` it's recommended to export this auth object from some root configuration file in your app.

```ts
// edgedb.ts

import { createClient } from "edgedb";
import createAuth from "@edgedb/auth-nextjs/app";

export const client = createClient({
  // Note: when developing locally you will need to set tls security to insecure,
  // because the development server uses self-signed certificates which will
  // cause api calls with the fetch api to fail.
  tlsSecurity: "insecure",
});

export const auth = createAuth(client, {
  baseUrl: "http://localhost:3000",
});
```

If using the pages router, you will need to also create a client auth object for use in any components or code that gets run in the browser. This client auth object will need to be exported from a separate file, to stop any server-side code (like the EdgeDB `client`) getting bundled into client-side:

```ts
// edgedb.client.ts
import createAuth, {
  type NextAuthOptions,
} from "@edgedb/auth-nextjs/pages/client";

export const options: NextAuthOptions = {
  baseUrl: "http://localhost:3000",
  passwordResetPath: "/reset-password",
};

export const auth = createAuth(options);

// edgedb.ts
import { createClient } from "edgedb";
import createAuth from "@edgedb/auth-nextjs/pages/server";

import { options } from "./edgedb.client";

export const client = createClient();

export const auth = createAuth(client, options);
```

**Note**: to work correctly, the auth config options need to be the same for both the the server and client `createAuth` calls. To keep the options defined in a single place, note that thay are defined and exported from the client file, to ensure Next.js doesn't import server code into the client.

The available auth config options are as follows:

- `baseUrl: string`, _required_, The url of your application; needed for various auth flows (eg. OAuth) to redirect back to.
- `authRoutesPath?: string`, The path to the auth route handlers, defaults to `'auth'`, see below for more details.
- `authCookieName?: string`, The name of the cookie where the auth token will be stored, defaults to `'edgedb-session'`.
- `pkceVerifierCookieName?: string`: The name of the cookie where the verifier for the PKCE flow will be stored, defaults to `'edgedb-pkce-verifier'`
- `passwordResetPath?: string`: The url or path of the the password reset page; needed if you want to enable password reset emails in your app. If path provided, it will be joined to the `baseUrl`.

### 2. Setup the auth route handlers

Call the `auth.createAuthRouteHandlers()` method, and export the returned `GET` and `POST` functions from the `app/auth/[...auth]/route.ts` route in your app. Callback functions can be provided to handle various auth events, where you can define what to do in the case of successful signin's or errors. These handlers expect no return value, and that you always call `redirect()` within them. You only need to configure callback functions for the types of auth you wish to use in your app.

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
- `onEmailVerify`
- `onBuiltinUICallback`
- `onSignout`

The following handlers are also available to mirror the server actions functionality if you are using the pages router api:

- `onEmailPasswordSignIn`
- `onEmailPasswordSignUp`
- `onEmailPasswordReset`

Unlike the other auth handlers, these handlers can return data, which will be passed back to the corresponding auth method on the client side. They can also handle redirects, which will similarly trigger a client side redirect in your app.

By default the handlers expect to exist under the `/auth` route in your app, however if you want to place them elsewhere, you will also need to configure the `authRoutesPath` option of `createAuth` to match.

**Note**: Even if you are using the pages router api, the auth route handlers still need to be created in the `app` directory of your app.

### 3. Add a login UI

Now we just need to setup the UI to allow your users to sign in/up, etc. The easiest way to get started is to use the EdgeDB Auth's builtin UI. Alternatively you can implement your own custom UI.

**Builtin UI**

To use the builtin auth UI, first you will need to enable the UI in the auth ext configuration (see the auth ext docs for details). For the `redirect_to` and `redirect_to_on_signup` configuration options, set them to `{your_app_url}/auth/builtin/callback` and `{your_app_url}/auth/builtin/callback?isSignUp=true` respectively. (Note: if you have setup the auth route handlers under a custom path, replace 'auth' in the above url with that path).

Then you just need to configure the `onBuiltinUICallback` handler to define what to do once the builtin ui redirects back to your app, and place a link to the builtin UI url returned by `auth.getBuiltinUIUrl()` (or `auth.getBuiltinUISignUpUrl()`) where you want to in your app. (Note: when using the pages router api, these methods will be on the client auth object).

**Custom UI**

To help with implementing your own custom auth UI, the `Auth` object has a number of methods you can use:

- `getOAuthUrl(providerName: string)`: This method takes the name of an OAuth provider (make sure you configure that ones you need in the auth ext config first) and returns a link that will initiate the OAuth sign in flow for that provider. You will also need to configure the `onOAuthCallback` auth route handler.
- `createServerActions()`: _(App router only)_ Returns a number of server actions that you can use in your UI:
  - `emailPasswordSignIn`
  - `emailPasswordSignUp`
  - `emailPasswordSendPasswordResetEmail`
  - `emailPasswordResetPassword`
  - `emailPasswordResendVerificationEmail`
  - `signout`
- `isPasswordResetTokenValid(resetToken: string)`: Checks if a password reset token is still valid.

If using the pages router api, equivalents of the above server actions are provided by the client auth object. Since these run client side, `emailPasswordSignIn`, `emailPasswordSignUp` and `emailPasswordResetPassword` also have corresponding auth route handlers, if you need to do any server side handling (see the 'Set up auth route handlers' section above).

## Usage

Now you have auth all configured and user's can signin/signup/etc. you can use the `auth.getSession()` method in your app pages or api routes to retrieve an `AuthSession` object. This session object allows you to check if the user is currently logged in with the `isSignedIn` method, and also provides a `Client` object automatically configured with the `ext::auth::client_token` global, so you can run queries using the `ext::auth::ClientTokenIdentity` of the currently signed in user. The session api can only be used server side, so can only be used in Server Components / Server Actions when using the app router, or in data fetching functions like `getServerSideProps` when using the pages router.

```tsx
import { auth } from "@/edgedb";

export default async function Home() {
  const session = await auth.getSession();

  const signedIn = await session.isSignedIn();

  return (
    <main>
      <h1>Home</h1>

      {signedIn ? (
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

Or using the pages router api:

```tsx
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { auth } from "@/edgedb";
import { auth as clientAuth } from "@/edgedb.client.ts";

export const getServerSideProps = (async ({ req }) => {
  const session = auth.getSession(req);

  return {
    props: {
      signedIn: await session.isSignedIn(),
    },
  };
}) satisfies GetServerSideProps<{
  signedIn: boolean;
}>;

export default function Home({
  signedIn,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <main>
      <h1>Home</h1>

      {signedIn ? (
        <>
          <div>You are signed in</div>
          {await session.client.queryJSON(`...`)}
        </>
      ) : (
        <>
          <div>You are not signed in</div>
          <a href={clientAuth.getBuiltinUIUrl()}>Sign in with Built-in UI</a>
        </>
      )}
    </main>
  );
}
```

## Further guides and examples

For more thorough guides and tutorials on setting up and using EdgeDB Auth, check out the [EdgeDB auth docs](https://www.edgedb.com/docs/guides/auth/index).

There are also some example repos that demonstrate building a simple Todo app using EdgeDB Auth, with both the Next.js (app router)[https://github.com/edgedb/edgedb-examples/tree/main/nextjs-auth#readme] and (pages router)[https://github.com/edgedb/edgedb-examples/tree/main/nextjs-auth-pages#readme].

## FAQs

### Can I use auth with both 'pages' and 'app' router at the same time in my app?

Yes. You'll need to create a separate `auth` object for each of pages and app routers, using the `createAuth` functions from `@edgedb/auth-nextjs/pages/server` and `@edgedb/auth-nextjs/app` respectively. Make sure to use the corresponding `auth` object depending on whether the page is under `/pages` or `/app`. Since the auth route handlers are always defined within the `/app` directory, you only need to do this once, and `createAuthRouteHandlers` method of either `auth` object can be used.

## API Reference

### App Router API's

Imported from `@edgedb/auth-nextjs/app`:

#### _function_ `createNextAppAuth` (default export)

```ts
createNextAppAuth(
  client: Client,
  options: NextAuthOptions
): NextAppAuth`
```

#### _class_ `NextAppAuth`

- _method_ `createAuthRouteHandlers(handlers: CreateAuthRouteHandlers)`

  Returns an object containing `GET` and `POST` API route functions that should be exported from the `app/auth/[...auth]/route.ts` route (or the route you specified in the `authRoutesPath` config option).

- _method_ `createServerActions()`

  Returns an object containing the following functions:

  - `emailPasswordSignIn( data: FormData | { email: string; password: string } ): Promise<TokenData>`

  - `emailPasswordSignUp( data: FormData | { email: string; password: string } ): Promise<TokenData | null>`

  - `emailPasswordSendPasswordResetEmail(data: FormData | { email: string } ): Promise<void>`

  - `emailPasswordResetPassword( data: FormData | { reset_token: string; password: string } ): Promise<TokenData>`

  - `emailPasswordResendVerificationEmail( data: FormData | { verification_token: string } ): Promise<void>`

  - `signout(): Promise<void>`

- _method_ `getSession(): NextAuthSession`

- _method_ `getProvidersInfo(): Promise<ProvidersInfo>`

  Returns `ProvidersInfo`:

  ```ts
  interface ProvidersInfo {
    oauth: {
      name: BuiltinOAuthProviderNames;
      display_name: string;
    }[];
    emailPassword: boolean;
  }
  ```

- _method_ `isPasswordResetTokenValid(resetToken: string): boolean`

- _method_ `getOAuthUrl(providerName: BuiltinOAuthProviderNames): string`

- _method_ `getBuiltinUIUrl(): string`

- _method_ `getBuiltinUISignUpUrl(): string`

- _method_ `getSignoutUrl(): string`

### Page Router API's

Imported from `@edgedb/auth-nextjs/pages/server`:

#### _function_ `createNextPagesServerAuth` (default export)

```ts
createNextPagesServerAuth(
  client: Client,
  options: NextAuthOptions
): NextPagesAuth`
```

#### _class_ `NextPagesAuth`

- _method_ `createAuthRouteHandlers(handlers: CreateAuthRouteHandlers)`

  Returns an object containing `GET` and `POST` API route functions that should be exported from the `app/auth/[...auth]/route.ts` route (or the route you specified in the `authRoutesPath` config option).

- _method_ `getSession(): NextAuthSession`

- _method_ `getProvidersInfo(): Promise<ProvidersInfo>`

  Returns `ProvidersInfo`:

  ```ts
  interface ProvidersInfo {
    oauth: {
      name: BuiltinOAuthProviderNames;
      display_name: string;
    }[];
    emailPassword: boolean;
  }
  ```

- _method_ `isPasswordResetTokenValid(resetToken: string): boolean`

- _method_ `getOAuthUrl(providerName: BuiltinOAuthProviderNames): string`

- _method_ `getBuiltinUIUrl(): string`

- _method_ `getBuiltinUISignUpUrl(): string`

- _method_ `getSignoutUrl(): string`

Imported from `@edgedb/auth-nextjs/pages/client`:

#### _function_ `createNextPagesClientAuth` (default export)

```ts
createNextPagesClientAuth(
  options: NextAuthOptions
): NextPagesClientAuth`
```

#### _class_ `NextPagesClientAuth`

- _method_ `getOAuthUrl(providerName: BuiltinOAuthProviderNames): string`

- _method_ `getBuiltinUIUrl(): string`

- _method_ `getBuiltinUISignUpUrl(): string`

- _method_ `getSignoutUrl(): string`

Each of these methods are the equivalent of the server actions from the app router api, and will return whatever data was returned by their corresponding auth route handler:

- _method_ `emailPasswordSignIn(data: { email: string; password: string } | FormData): Promise<any>`

- _method_ `emailPasswordSignUp(data: { email: string; password: string } | FormData): Promise<any>`

- _method_ `emailPasswordSendPasswordResetEmail(data: { email: string } | FormData): Promise<any>`

- _method_ `emailPasswordResetPassword(data: { reset_token: string; password: string } | FormData): Promise<any>`

- _method_ `emailPasswordResendVerificationEmail(data: { verification_token: string } | FormData): Promise<any>`

### Shared API's

#### _class_ `NextAuthSession`

- _property_ `client`

  A copy of the EdgeDB `Client` object passed to `createAuth` configured with the currently signed in user's auth token.

- _method_ `isSignedIn(): Promise<boolean>`

#### _type_ `NextAuthOptions`

- `baseUrl: string`, _required_, The url of your application; needed for various auth flows (eg. OAuth) to redirect back to.
- `authRoutesPath?: string`, The path to the auth route handlers, defaults to `'auth'`, see below for more details.
- `authCookieName?: string`, The name of the cookie where the auth token will be stored, defaults to `'edgedb-session'`.
- `pkceVerifierCookieName?: string`: The name of the cookie where the verifier for the PKCE flow will be stored, defaults to `'edgedb-pkce-verifier'`
- `passwordResetPath?: string`: The url or path of the the password reset page; needed if you want to enable password reset emails in your app. If path provided, it will be joined to the `baseUrl`.

#### _type_ `CreateAuthRouteHandlers`

Every handler is optional. The params object passed to each handler will always have an `error` property (unless specified); when there was no error this will be `null`, otherwise it will be an `Error` and every other _success_ params property will be `undefined`.

The following handlers either handle redirects back from the EdgeDB auth server, or links from emails, and so must always call `redirect()` to redirect to the appropriate location in your app:

- `onOAuthCallback(params): Promise<never>`

  **error** _params_

  - `error: Error`

  **success** _params_

  - `tokenData: TokenData`
  - `provider: BuiltinOAuthProviderNames`
  - `isSignUp: boolean`

- `onEmailVerify(params): Promise<never>`

  **error** _params_

  - `error: Error`
  - `verificationToken?: string`

  **success** _params_

  - `tokenData: TokenData`

- `onBuiltinUICallback(params): Promise<never>`

  **error** _params_

  - `error: Error`

  **success** _params_

  - `tokenData: TokenData | null`
  - `provider: BuiltinProviderNames | null` (if `tokenData` is `null`, `provider` will also be `null`)
  - `isSignUp: boolean`

  **Note**: If `tokenData` is `null`, then this represents a user successfully signing up by email/password, but they are not signed in because email verification is required.

- `onSignout(): Promise<never>`

  No params

The following handlers represent the server side component of 'server action' like methods provided for the pages router api. They may call `redirect()`, return a `Response` with json data, or throw an `Error`, all of which will be passed back to their counterpart client side method.

- `onEmailPasswordSignIn(params): Promise<Response>`

  **error** _params_

  - `error: Error`

  **success** _params_

  - `tokenData: TokenData`

- `onEmailPasswordSignUp(params): Promise<Response>`

  **error** _params_

  - `error: Error`

  **success** _params_

  - `tokenData: TokenData`

- `onEmailPasswordReset(params): Promise<Response>`

  **error** _params_

  - `error: Error`

  **success** _params_

  - `tokenData: TokenData`

#### _type_ `TokenData`

Represents the result of successfully completing authentication.

- `auth_token: string`: The raw JWT returned by the server.
- `identity_id: string | null`: The UUID of the `ext::auth::Identity`
- `provider_token: string | null`: If the identity is an OAuth identity, this is the original auth token provided by the Identity Provider.
- `provider_refresh_token: string | null`: If the identity is an OAuth identity, this is the original refresh token provided by the Identity Provider, if it was provided by the provider.

#### _type_ `BuiltinProviderNames`

Union of available provider names. Currently `"builtin::oauth_apple" | "builtin::oauth_azure" | "builtin::oauth_github" | "builtin::oauth_google" | "builtin::local_emailpassword"`
