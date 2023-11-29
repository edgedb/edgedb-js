import type { Client } from "edgedb";
import {
  Auth,
  BuiltinOAuthProviderNames,
  ParamsOrError,
  TokenData,
  emailPasswordProviderName,
} from "@edgedb/auth-core";

import { RemixAuthOptions, RemixClientAuth } from "./client";

export type { RemixAuthOptions } from "./client";

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

export function createServerAuth(client: Client, options: RemixAuthOptions) {
  return new RemixServerAuth(client, options);
}

export interface CreateAuthRouteHandlers {
  // onOAuthCallback(
  //   params: ParamsOrError<{
  //     tokenData: TokenData;
  //     provider: BuiltinOAuthProviderNames;
  //     isSignUp: boolean;
  //   }>
  // ): void;
  // onEmailPasswordSignIn(params: ParamsOrError<{ tokenData: TokenData }>): void;
  // onEmailPasswordSignUp(
  //   params: ParamsOrError<{ tokenData: TokenData | null }>
  // ): void;
  // onEmailPasswordReset(params: ParamsOrError<{ tokenData: TokenData }>): void;
  // onEmailVerify(
  //   params: ParamsOrError<
  //     { tokenData: TokenData },
  //     { verificationToken?: string }
  //   >
  // ): void;
  onBuiltinUICallback(
    params: ParamsOrError<
      (
        | {
            tokenData: TokenData;
            provider: BuiltinProviderNames;
          }
        | { tokenData: null; provider: null }
      ) & { isSignUp: boolean }
    >
  ): Promise<Response>;
  onSignout(): Promise<Response>;
}

export class RemixServerAuth extends RemixClientAuth {
  private readonly client: Client;
  private readonly core: Promise<Auth>;

  constructor(client: Client, options: RemixAuthOptions) {
    super(options);

    this.client = client;
    this.core = Auth.create(client);
  }

  isPasswordResetTokenValid(resetToken: string) {
    return Auth.checkPasswordResetTokenValid(resetToken);
  }

  // getSession() {
  //   return new NextAuthSession(
  //     this.client,
  //     cookies().get(this.options.authCookieName)?.value.split(";")[0]
  //   );
  // }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  createAuthRouteHandlers({
    // onOAuthCallback,
    // onEmailPasswordSignIn,
    // onEmailPasswordSignUp,
    // onEmailPasswordReset,
    // onEmailVerify,
    onBuiltinUICallback,
    onSignout,
  }: Partial<CreateAuthRouteHandlers>) {
    return {
      loader: async ({
        request,
        params,
      }: {
        request: Request;
        params: { [key: string]: string | undefined };
      }) => {
        const path = params["*"];
        if (!path) {
          throw new Error(`route handlers file should end with '.$.ts'`);
        }
        console.log(request.headers.get("Cookie"));
        const searchParams = new URL(request.url).searchParams;
        switch (path) {
          case "builtin/callback": {
            if (!onBuiltinUICallback) {
              throw new Error(
                `'onBuiltinUICallback' auth route handler not configured`
              );
            }
            const error = searchParams.get("error");
            if (error) {
              const desc = searchParams.get("error_description");
              return onBuiltinUICallback({
                error: new Error(error + (desc ? `: ${desc}` : "")),
              });
            }
            const code = searchParams.get("code");
            const verificationEmailSentAt = searchParams.get(
              "verification_email_sent_at"
            );

            if (!code) {
              if (verificationEmailSentAt) {
                return onBuiltinUICallback({
                  error: null,
                  tokenData: null,
                  provider: null,
                  isSignUp: true,
                });
              }
              return onBuiltinUICallback({
                error: new Error("no pkce code in response"),
              });
            }
            const verifier =
              parseCookies(request)[this.options.pkceVerifierCookieName];
            console.log(verifier);
            if (!verifier) {
              return onBuiltinUICallback({
                error: new Error("no pkce verifier cookie found"),
              });
            }
            const isSignUp = searchParams.get("isSignUp") === "true";
            let tokenData: TokenData;
            try {
              tokenData = await (await this.core).getToken(code, verifier);
            } catch (err) {
              return onBuiltinUICallback({
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }

            const res = await onBuiltinUICallback({
              error: null,
              tokenData,
              provider: searchParams.get("provider") as BuiltinProviderNames,
              isSignUp,
            });
            const headers = new Headers(res.headers);
            headers.append(
              "Set-Cookie",
              `${this.options.authCookieName}=${tokenData.auth_token}; HttpOnly; SameSite=Lax`
            );
            headers.append(
              "Set-Cookie",
              `${this.options.pkceVerifierCookieName}=`
            );
            return new Response(res.body, {
              status: res.status,
              statusText: res.statusText,
              headers,
            });
          }
          case "builtin/signin":
          case "builtin/signup": {
            const pkceSession = await this.core.then((core) =>
              core.createPKCESession()
            );
            return new Response(null, {
              status: 302,
              headers: {
                "Set-Cookie": `${this.options.pkceVerifierCookieName}=${pkceSession.verifier}; HttpOnly`,
                Location:
                  path.split("/").pop() === "signup"
                    ? pkceSession.getHostedUISignupUrl()
                    : pkceSession.getHostedUISigninUrl(),
              },
            });
          }
          case "signout": {
            if (!onSignout) {
              throw new Error(`'onSignout' auth route handler not configured`);
            }
            const res = await onSignout();
            return new Response(res.body, {
              status: res.status,
              statusText: res.statusText,
              headers: {
                ...res.headers,
                "Set-Cookie": `${this.options.authCookieName}=`,
              },
            });
          }
          default:
            throw new Error("Unknown auth route");
        }
      },
    };
  }
}

function parseCookies(request: Request) {
  return (request.headers.get("Cookie") ?? "")
    .split(";")
    .reduce((cookies, cookie) => {
      const [name, val] = cookie.split("=");
      cookies[name.trim()] = val.trim();
      return cookies;
    }, {} as { [key: string]: string | undefined });
}
