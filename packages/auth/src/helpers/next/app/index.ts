import { Client } from "edgedb";
import {
  AuthPCKESession,
  Auth,
  BuiltinOAuthProviderNames,
  builtinLocalProviderNames,
  builtinOAuthProviderNames,
  TokenData,
} from "../../../core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export interface NextAppAuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
}

export class NextAppAuth {
  private readonly core: Promise<Auth>;
  /** @internal */
  readonly options: Required<NextAppAuthOptions>;

  /** @internal */
  constructor(client: Client, options: NextAppAuthOptions) {
    this.core = Auth.create(client);
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      authRoutesPath: options.authRoutesPath?.replace(/^\/|\/$/g, "") ?? "auth",
      authCookieName: options.authCookieName ?? "edgedb-session",
      pkceVerifierCookieName:
        options.pkceVerifierCookieName ?? "edgedb-pkce-verifier",
    };
  }

  private get _authRoute() {
    return `${this.options.baseUrl}/${this.options.authRoutesPath}`;
  }

  createAuthRouteHandlers({
    onOAuthCallback,
    onEmailPasswordSignIn,
    onEmailPasswordSignUp,
    onEmailVerify,
    onBuiltinUICallback,
    onSignout,
  }: {
    onOAuthCallback?: ((
      err: null,
      tokenData: TokenData,
      isSignup: boolean
    ) => void) &
      ((err: Error, tokenData?: undefined, isSignup?: undefined) => void);
    onEmailPasswordSignIn?: ((err: null, tokenData: TokenData) => void) &
      ((err: Error, tokenData?: undefined) => void);
    onEmailPasswordSignUp?: ((err: null, tokenData: TokenData | null) => void) &
      ((err: Error, tokenData?: undefined) => void);
    onEmailVerify?: ((err: null, tokenData: TokenData) => void) &
      ((err: Error, tokenData?: undefined) => void);
    onBuiltinUICallback?: ((err: null, tokenData: TokenData) => void) &
      ((err: Error, tokenData?: undefined) => void);
    onSignout?: () => void;
  }) {
    return {
      GET: async (
        req: NextRequest,
        { params }: { params: { auth: string[] } }
      ) => {
        switch (params.auth.join("/")) {
          case "oauth": {
            if (!onOAuthCallback) {
              throw new Error(
                `'onOAuthCallback' auth route handler not configured`
              );
            }
            const provider = req.nextUrl.searchParams.get(
              "provider_name"
            ) as any;
            if (!provider || !builtinOAuthProviderNames.includes(provider)) {
              throw new Error(`invalid provider_name: ${provider}`);
            }
            const redirectUrl = `${this._authRoute}/oauth/callback`;
            const pkceSession = (await this.core).createPKCESession();
            cookies().set({
              name: this.options.pkceVerifierCookieName,
              value: pkceSession.verifier,
              httpOnly: true,
            });
            return redirect(
              pkceSession.getOAuthUrl(
                provider,
                redirectUrl,
                `${redirectUrl}?isSignup=true`
              )
            );
          }
          case "oauth/callback": {
            if (!onOAuthCallback) {
              throw new Error(
                `'onOAuthCallback' auth route handler not configured`
              );
            }
            const code = req.nextUrl.searchParams.get("code");
            const isSignup =
              req.nextUrl.searchParams.get("isSignup") === "true";
            const verifier = req.cookies.get(
              this.options.pkceVerifierCookieName
            )?.value;
            if (!code) {
              return onOAuthCallback(new Error("no pkce code in response"));
            }
            if (!verifier) {
              return onOAuthCallback(
                new Error("no pkce verifier cookie found")
              );
            }
            let tokenData: TokenData;
            try {
              tokenData = await (await this.core).getToken(code, verifier);
            } catch (err) {
              return onOAuthCallback(
                err instanceof Error ? err : new Error(String(err))
              );
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "lax",
            });
            cookies().delete(this.options.pkceVerifierCookieName);

            return onOAuthCallback(null, tokenData, isSignup);
          }
          case "emailpassword/verify": {
            if (!onEmailVerify) {
              throw new Error(
                `'onEmailVerify' auth route handler not configured`
              );
            }
            const verificationToken =
              req.nextUrl.searchParams.get("verification_token");
            const verifier = req.cookies.get(
              this.options.pkceVerifierCookieName
            )?.value;
            if (!verificationToken) {
              return onEmailVerify(
                new Error("no verification_token in response")
              );
            }
            if (!verifier) {
              return onEmailVerify(new Error("no pkce verifier cookie found"));
            }
            let tokenData: TokenData;
            try {
              tokenData = await (
                await this.core
              ).verifyEmailPasswordSignup(verificationToken, verifier);
            } catch (err) {
              return onEmailVerify(
                err instanceof Error ? err : new Error(String(err))
              );
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "strict",
            });
            cookies().delete(this.options.pkceVerifierCookieName);

            return onEmailVerify(null, tokenData);
          }
          case "builtin": {
            if (!onBuiltinUICallback) {
              throw new Error(
                `'onBuiltinUICallback' auth route handler not configured`
              );
            }
            const code = req.nextUrl.searchParams.get("code");
            const verifier = req.cookies.get(
              this.options.pkceVerifierCookieName
            )?.value;
            if (!code) {
              return onBuiltinUICallback(new Error("no pkce code in response"));
            }
            if (!verifier) {
              return onBuiltinUICallback(
                new Error("no pkce verifier cookie found")
              );
            }
            let tokenData: TokenData;
            try {
              tokenData = await (await this.core).getToken(code, verifier);
            } catch (err) {
              return onBuiltinUICallback(
                err instanceof Error ? err : new Error(String(err))
              );
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "lax",
            });
            cookies().delete(this.options.pkceVerifierCookieName);

            return onBuiltinUICallback(null, tokenData);
          }
          case "builtin/signin":
          case "builtin/signup": {
            const pkceSession = (await this.core).createPKCESession();
            cookies().set({
              name: this.options.pkceVerifierCookieName,
              value: pkceSession.verifier,
              httpOnly: true,
            });
            return redirect(
              params.auth[params.auth.length - 1] === "signup"
                ? pkceSession.getHostedUISignupUrl()
                : pkceSession.getHostedUISigninUrl()
            );
          }
          case "signout": {
            if (!onSignout) {
              throw new Error(`'onSignout' auth route handler not configured`);
            }
            cookies().delete(this.options.authCookieName);
            return onSignout();
          }
          default:
            return new Response("Unknown auth route", {
              status: 404,
            });
        }
      },
      POST: async (
        req: NextRequest,
        { params }: { params: { auth: string[] } }
      ) => {
        switch (params.auth.join("/")) {
          case "emailpassword/signin": {
            if (!onEmailPasswordSignIn) {
              throw new Error(
                `'onEmailPasswordSignIn' auth route handler not configured`
              );
            }
            let tokenData: TokenData;
            try {
              const { email, password } = extractEmailPassword(
                req.headers.get("Content-Type") === "application/json"
                  ? await req.json()
                  : await req.formData()
              );
              tokenData = await (
                await this.core
              ).signinWithEmailPassword(email, password);
            } catch (err) {
              return onEmailPasswordSignIn(
                err instanceof Error ? err : new Error(String(err))
              );
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "lax",
            });
            return onEmailPasswordSignIn(null, tokenData);
          }
          case "emailpassword/signup": {
            if (!onEmailPasswordSignUp) {
              throw new Error(
                `'onEmailPasswordSignUp' auth route handler not configured`
              );
            }
            let result: Awaited<
              ReturnType<Awaited<typeof this.core>["signupWithEmailPassword"]>
            >;
            try {
              const { email, password } = extractEmailPassword(
                req.headers.get("Content-Type") === "application/json"
                  ? await req.json()
                  : await req.formData()
              );
              result = await (
                await this.core
              ).signupWithEmailPassword(
                email,
                password,
                `${this._authRoute}/emailpassword/verify`
              );
            } catch (err) {
              return onEmailPasswordSignUp(
                err instanceof Error ? err : new Error(String(err))
              );
            }
            if (result.status === "complete") {
              cookies().set({
                name: this.options.authCookieName,
                value: result.tokenData.auth_token,
                httpOnly: true,
                sameSite: "strict",
              });
              return onEmailPasswordSignUp(null, result.tokenData);
            } else {
              cookies().set({
                name: this.options.pkceVerifierCookieName,
                value: result.verifier,
                httpOnly: true,
                sameSite: "strict",
              });
              return onEmailPasswordSignUp(null, null);
            }
          }
          default:
            return new Response("Unknown auth route", {
              status: 404,
            });
        }
      },
    };
  }

  createServerActions() {
    return {
      signout: async () => {
        cookies().delete(this.options.authCookieName);
      },
      emailPasswordSignIn: async (
        data: FormData | { email: string; password: string }
      ) => {
        const { email, password } = extractEmailPassword(data);
        const tokenData = await (
          await this.core
        ).signinWithEmailPassword(email, password);
        cookies().set({
          name: this.options.authCookieName,
          value: tokenData.auth_token,
          httpOnly: true,
          sameSite: "lax",
        });
        return tokenData;
      },
      emailPasswordSignUp: async (
        data: FormData | { email: string; password: string }
      ) => {
        const { email, password } = extractEmailPassword(data);
        const result = await (
          await this.core
        ).signupWithEmailPassword(
          email,
          password,
          `${this._authRoute}/emailpassword/verify`
        );
        if (result.status === "complete") {
          cookies().set({
            name: this.options.authCookieName,
            value: result.tokenData.auth_token,
            httpOnly: true,
            sameSite: "strict",
          });
          return result.tokenData;
        } else {
          cookies().set({
            name: this.options.pkceVerifierCookieName,
            value: result.verifier,
            httpOnly: true,
            sameSite: "strict",
          });
          return null;
        }
      },
    };
  }

  async getSession() {
    return new NextAppAuthSession(this, (await this.core).client);
  }

  getOAuthUrl(providerName: BuiltinOAuthProviderNames) {
    return `${this._authRoute}/oauth?${new URLSearchParams({
      provider_name: providerName,
    }).toString()}`;
  }

  getBuiltinUIUrl() {
    return `${this._authRoute}/builtin/signin`;
  }
  getBuiltinUISignupUrl() {
    return `${this._authRoute}/builtin/signup`;
  }

  getSignoutUrl() {
    return `${this._authRoute}/signout`;
  }
}

export default function createNextAppAuth(
  client: Client,
  options: NextAppAuthOptions
) {
  return new NextAppAuth(client, options);
}

export class NextAppAuthSession {
  private readonly authToken?: string;
  public readonly client: Client;

  /** @internal */
  constructor(private readonly auth: NextAppAuth, client: Client) {
    this.authToken = cookies()
      .get(auth.options.authCookieName)
      ?.value.split(";")[0];
    this.client = this.authToken
      ? client.withGlobals({ "ext::auth::client_token": this.authToken })
      : client;
  }

  async isLoggedIn() {
    if (!this.authToken) return false;
    return (await this.client.querySingle(
      `select exists global ext::auth::ClientTokenIdentity`
    )) as boolean;
  }
}

function extractEmailPassword(data: FormData | any) {
  let email: string | undefined;
  let password: string | undefined;
  if (data instanceof FormData) {
    email = data.get("email")?.toString();
    password = data.get("password")?.toString();
  } else {
    email = data.email;
    password = data.password;
  }
  if (!email || !password) {
    throw new Error(`email or password is missing`);
  }
  return { email, password };
}
