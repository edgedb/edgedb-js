# `@edgedb/auth-express`

This library provides a set of utilities to help you integrate authentication into your Express.js application. It supports various authentication methods including OAuth, email/password, and session-based authentication.

## Installation

This package is published on npm and can be installed with your package manager of choice.

```bash
npm install @edgedb/auth-express
```

**Note:** We have tested this library against the latest version of Express v4 with the types provided at DefinitelyTyped and have set up `peerDependencies` based on typical usage with npm.

## Express middleware requirements

This library depends on the following middleware being installed in your Express app:

- `body-parser`: both JSON and urlencoded
- `cookie-parser`

```ts
import express from "express";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
```

## Usage

This library provides a few affordances for adding EdgeDB Auth to your existing Express app:

- Routers and route handlers to handle the authentication flow required by EdgeDB.
- Middleware to attach sessions to requests.
- Some additional utility functions for handling various auth related concerns.

### Setting up auth routes

After [configuring the EdgeDB Auth extension](https://www.edgedb.com/docs/guides/auth/index), you can set up the various auth routes with our route builders.

Start by instantiating an `ExpressAuth` object by passing it a configured EdgeDB client and some options:

```ts
import { createClient } from "edgedb";
import createExpressAuth from "@edgedb/auth-express";
import * as expressAuth from "@edgedb/auth-express";

const client = createClient();
const auth = createExpressAuth(client, {
  baseUrl: "http://localhost:3000", // Put the URL to your Express app here
});
```

The available auth config options are as follows:

- `baseUrl: string`, required, The url of your application; needed for various auth flows (eg. OAuth) to redirect back to.
- `authRoutesPath?: string`, The path to the auth route handlers, defaults to 'auth', see below for more details.
- `authCookieName?: string`, The name of the cookie where the auth token will be stored, defaults to 'edgedb-session'.
- `pkceVerifierCookieName?: string`: The name of the cookie where the verifier for the PKCE flow will be stored, defaults to 'edgedb-pkce-verifier'
- `passwordResetUrl?: string`: The url of the the password reset page; needed if you want to enable password reset emails in your app.

#### Built-in UI

If you're using our built-in UI, all you need to do is attach a callback handler to the built-in UI router factory:

```ts
const builtinRouter = expressAuth.createBuiltinRouter({
  callback: [
    (req: expressAuth.CallbackRequest, res, next) => {
      if (req.isSignUp) {
        return res.redirect("/onboarding");
      }

      res.redirect("/");
    },
  ],
});

app.use("/auth", builtinRouter);
// Creates the following routes:
// - /auth/signin: Redirects to built-in UI's sign in page
// - /auth/signup: Redirects to built-in UI's sign up page
// - /auth/callback: You must provide a terminating route handler in the configuration
```

The route builder takes an object that allows attaching middlewarem, route handlers, and/or error handlers to the configured routes by passing an array of handlers. Only one is required: the callback handler. This allows setting up a redirect for successful authentication, and the ability to inject custom middleware after the auth middleware runs.

The `CallbackRequest` includes a few additional keys on the `Request` object:
- `req.session?: ExpressAuthSession`
- `req.tokenData?: TokenData`
- `req.provider?: ProviderName`: The name of the provider type that this authentication event is for.
- `req.isSignUp?: boolean`: If this authentication event represents a new user signing up, or an existing user signing in.

If an error occured during the authentication flow, it will be passed to the Express error handler. You can add a custom Error handler to the middleware array to handle errors in a custom way here.

Each route is also available as a middleware itself for maximum customization, to allow custom route names, per-route middleware customization, and integration with advanced Express patterns. Here's an equivalent example:

```ts
const builtinRouter = Router()
  .get("/signin", expressAuth.builtin.signIn)
  .get("/signup", expressAuth.builtin.signUp)
  .get(
    "/callback",
    expressAuth.builtin.callback,
    (req: expressAuth.CallbackRequest, res, next) => {
      if (req.isSignUp) {
        return res.redirect("/onboarding");
      }

      res.redirect("/");
    }
  );

app.use("/auth", builtinRouter);
```

## Reference

### `ExpressAuthSession`

- `client: Client`: `ext::auth::auth_token` global set based on the auth token that is present in the authentication cookie. If there is no cookie, the `Client` will be the original client that was passed when creating the `ExpressAuth` object.
- `isLoggedIn: () => Promise<boolean>`: Checks to see if this Request has a valid, unexpired auth token.

### `TokenData`

Represents the result of successfully completing authentication.

- `auth_token: string`: The raw JWT returned by the server.
- `identity_id: string | null`: The UUID of the `ext::auth::Identity`
- `provider_token: string | null`: If the identity is an OAuth identity, this is the original auth token provided by the Identity Provider.
- `provider_refresh_token: string | null`: If the identity is an OAuth identity, this is the original refresh token provided by the Identity Provider, if it was provided by the provider.

### `AuthRequest`

This is an extension of the Express `Request` interface containing some optional data added by the various auth middleware.

- `session?: ExpressAuthSession`
- `tokenData?: TokenData`
