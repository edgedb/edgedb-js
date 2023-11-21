import {
  Auth,
  builtinOAuthProviderNames,
  type BuiltinOAuthProviderNames,
  type TokenData,
} from "@edgedb/auth-core";
import type { Client } from "edgedb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import {
  NextAuth,
  NextAuthSession,
  type NextAuthOptions,
  BuiltinProviderNames,
} from "../shared";

export {
  NextAuthSession,
  type NextAuthOptions,
  type BuiltinProviderNames,
  type TokenData,
};

type ParamsOrError<Result extends object, ErrorDetails extends object = {}> =
  | ({ error: null } & { [Key in keyof ErrorDetails]?: undefined } & Result)
  | ({ error: Error } & ErrorDetails & { [Key in keyof Result]?: undefined });

export interface CreateAuthRouteHandlers {
  onOAuthCallback(
    params: ParamsOrError<{
      tokenData: TokenData;
      provider: BuiltinOAuthProviderNames;
      isSignUp: boolean;
    }>
  ): void;
  onEmailPasswordSignIn(params: ParamsOrError<{ tokenData: TokenData }>): void;
  onEmailPasswordSignUp(
    params: ParamsOrError<{ tokenData: TokenData | null }>
  ): void;
  onEmailPasswordReset(params: ParamsOrError<{ tokenData: TokenData }>): void;
  onEmailVerify(
    params: ParamsOrError<
      { tokenData: TokenData },
      { verificationToken?: string }
    >
  ): void;
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
  ): void;
  onSignout(): void;
}

export class NextAppAuth extends NextAuth {
  private readonly core: Promise<Auth>;

  constructor(client: Client, options: NextAuthOptions) {
    super(client, options);
    this.core = Auth.create(client);
  }

  getSession() {
    return new NextAuthSession(
      this.client,
      cookies().get(this.options.authCookieName)?.value.split(";")[0]
    );
  }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  createAuthRouteHandlers({
    onOAuthCallback,
    onEmailPasswordSignIn,
    onEmailPasswordSignUp,
    onEmailPasswordReset,
    onEmailVerify,
    onBuiltinUICallback,
    onSignout,
  }: Partial<CreateAuthRouteHandlers>) {
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
            ) as BuiltinOAuthProviderNames | null;
            if (!provider || !builtinOAuthProviderNames.includes(provider)) {
              throw new Error(`invalid provider_name: ${provider}`);
            }
            const redirectUrl = `${this._authRoute}/oauth/callback`;
            const pkceSession = await this.core.then((core) =>
              core.createPKCESession()
            );
            cookies().set({
              name: this.options.pkceVerifierCookieName,
              value: pkceSession.verifier,
              httpOnly: true,
            });
            return redirect(
              pkceSession.getOAuthUrl(
                provider,
                redirectUrl,
                `${redirectUrl}?isSignUp=true`
              )
            );
          }
          case "oauth/callback": {
            if (!onOAuthCallback) {
              throw new Error(
                `'onOAuthCallback' auth route handler not configured`
              );
            }
            const error = req.nextUrl.searchParams.get("error");
            if (error) {
              const desc = req.nextUrl.searchParams.get("error_description");
              return onOAuthCallback({
                error: new Error(error + (desc ? `: ${desc}` : "")),
              });
            }
            const code = req.nextUrl.searchParams.get("code");
            const isSignUp =
              req.nextUrl.searchParams.get("isSignUp") === "true";
            const verifier = req.cookies.get(
              this.options.pkceVerifierCookieName
            )?.value;
            if (!code) {
              return onOAuthCallback({
                error: new Error("no pkce code in response"),
              });
            }
            if (!verifier) {
              return onOAuthCallback({
                error: new Error("no pkce verifier cookie found"),
              });
            }
            let tokenData: TokenData;
            try {
              tokenData = await (await this.core).getToken(code, verifier);
            } catch (err) {
              return onOAuthCallback({
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "lax",
            });
            cookies().delete(this.options.pkceVerifierCookieName);

            return onOAuthCallback({
              error: null,
              tokenData,
              provider: req.nextUrl.searchParams.get(
                "provider"
              ) as BuiltinOAuthProviderNames,
              isSignUp,
            });
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
              return onEmailVerify({
                error: new Error("no verification_token in response"),
              });
            }
            if (!verifier) {
              return onEmailVerify({
                error: new Error("no pkce verifier cookie found"),
                verificationToken,
              });
            }
            let tokenData: TokenData;
            try {
              tokenData = await (
                await this.core
              ).verifyEmailPasswordSignup(verificationToken, verifier);
            } catch (err) {
              return onEmailVerify({
                error: err instanceof Error ? err : new Error(String(err)),
                verificationToken,
              });
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "strict",
            });
            cookies().delete(this.options.pkceVerifierCookieName);

            return onEmailVerify({ error: null, tokenData });
          }
          case "builtin/callback": {
            if (!onBuiltinUICallback) {
              throw new Error(
                `'onBuiltinUICallback' auth route handler not configured`
              );
            }
            const error = req.nextUrl.searchParams.get("error");
            if (error) {
              const desc = req.nextUrl.searchParams.get("error_description");
              return onBuiltinUICallback({
                error: new Error(error + (desc ? `: ${desc}` : "")),
              });
            }
            const code = req.nextUrl.searchParams.get("code");
            const verificationEmailSentAt = req.nextUrl.searchParams.get(
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
            const verifier = req.cookies.get(
              this.options.pkceVerifierCookieName
            )?.value;
            if (!verifier) {
              return onBuiltinUICallback({
                error: new Error("no pkce verifier cookie found"),
              });
            }
            const isSignUp =
              req.nextUrl.searchParams.get("isSignUp") === "true";
            let tokenData: TokenData;
            try {
              tokenData = await (await this.core).getToken(code, verifier);
            } catch (err) {
              return onBuiltinUICallback({
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "lax",
            });
            cookies().delete(this.options.pkceVerifierCookieName);

            return onBuiltinUICallback({
              error: null,
              tokenData,
              provider: req.nextUrl.searchParams.get(
                "provider"
              ) as BuiltinProviderNames,
              isSignUp,
            });
          }
          case "builtin/signin":
          case "builtin/signup": {
            const pkceSession = await this.core.then((core) =>
              core.createPKCESession()
            );
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
              const [email, password] = _extractParams(
                await _getReqBody(req),
                ["email", "password"],
                "email or password missing from request body"
              );
              tokenData = await (
                await this.core
              ).signinWithEmailPassword(email, password);
            } catch (err) {
              return onEmailPasswordSignIn({
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "strict",
            });
            return onEmailPasswordSignIn({ error: null, tokenData });
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
              const [email, password] = _extractParams(
                await _getReqBody(req),
                ["email", "password"],
                "email or password missing from request body"
              );
              result = await (
                await this.core
              ).signupWithEmailPassword(
                email,
                password,
                `${this._authRoute}/emailpassword/verify`
              );
            } catch (err) {
              return onEmailPasswordSignUp({
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }
            cookies().set({
              name: this.options.pkceVerifierCookieName,
              value: result.verifier,
              httpOnly: true,
              sameSite: "strict",
            });
            if (result.status === "complete") {
              cookies().set({
                name: this.options.authCookieName,
                value: result.tokenData.auth_token,
                httpOnly: true,
                sameSite: "strict",
              });
              return onEmailPasswordSignUp({
                error: null,
                tokenData: result.tokenData,
              });
            } else {
              return onEmailPasswordSignUp({ error: null, tokenData: null });
            }
          }
          case "emailpassword/send-reset-email": {
            if (!this.options.passwordResetPath) {
              throw new Error(`'passwordResetPath' option not configured`);
            }
            const [email] = _extractParams(
              await _getReqBody(req),
              ["email"],
              "email missing from request body"
            );
            const { verifier } = await (
              await this.core
            ).sendPasswordResetEmail(
              email,
              new URL(
                this.options.passwordResetPath,
                this.options.baseUrl
              ).toString()
            );
            cookies().set({
              name: this.options.pkceVerifierCookieName,
              value: verifier,
              httpOnly: true,
              sameSite: "strict",
            });
            return new Response(null, { status: 204 });
          }
          case "emailpassword/reset-password": {
            if (!onEmailPasswordReset) {
              throw new Error(
                `'onEmailPasswordReset' auth route handler not configured`
              );
            }
            let tokenData: TokenData;
            try {
              const verifier = req.cookies.get(
                this.options.pkceVerifierCookieName
              )?.value;
              if (!verifier) {
                return onEmailPasswordReset({
                  error: new Error("no pkce verifier cookie found"),
                });
              }
              const [resetToken, password] = _extractParams(
                await _getReqBody(req),
                ["reset_token", "password"],
                "reset_token or password missing from request body"
              );

              tokenData = await (
                await this.core
              ).resetPasswordWithResetToken(resetToken, verifier, password);
            } catch (err) {
              return onEmailPasswordReset({
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "strict",
            });
            cookies().delete(this.options.pkceVerifierCookieName);
            return onEmailPasswordReset({ error: null, tokenData });
          }
          case "emailpassword/resend-verification-email": {
            const [verificationToken] = _extractParams(
              await _getReqBody(req),
              ["verification_token"],
              "verification_token missing from request body"
            );
            (await this.core).resendVerificationEmail(verificationToken);
            return new Response(null, { status: 204 });
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
        const [email, password] = _extractParams(
          data,
          ["email", "password"],
          "email or password missing"
        );
        const tokenData = await (
          await this.core
        ).signinWithEmailPassword(email, password);
        cookies().set({
          name: this.options.authCookieName,
          value: tokenData.auth_token,
          httpOnly: true,
          sameSite: "strict",
        });
        return tokenData;
      },
      emailPasswordSignUp: async (
        data: FormData | { email: string; password: string }
      ) => {
        const [email, password] = _extractParams(
          data,
          ["email", "password"],
          "email or password missing"
        );
        const result = await (
          await this.core
        ).signupWithEmailPassword(
          email,
          password,
          `${this._authRoute}/emailpassword/verify`
        );
        cookies().set({
          name: this.options.pkceVerifierCookieName,
          value: result.verifier,
          httpOnly: true,
          sameSite: "strict",
        });
        if (result.status === "complete") {
          cookies().set({
            name: this.options.authCookieName,
            value: result.tokenData.auth_token,
            httpOnly: true,
            sameSite: "strict",
          });
          return result.tokenData;
        }
        return null;
      },
      emailPasswordSendPasswordResetEmail: async (
        data: FormData | { email: string }
      ) => {
        if (!this.options.passwordResetPath) {
          throw new Error(`'passwordResetPath' option not configured`);
        }
        const [email] = _extractParams(data, ["email"], "email missing");
        const { verifier } = await (
          await this.core
        ).sendPasswordResetEmail(
          email,
          new URL(
            this.options.passwordResetPath,
            this.options.baseUrl
          ).toString()
        );
        cookies().set({
          name: this.options.pkceVerifierCookieName,
          value: verifier,
          httpOnly: true,
          sameSite: "strict",
        });
      },
      emailPasswordResetPassword: async (
        data: FormData | { reset_token: string; password: string }
      ) => {
        const verifier = cookies().get(
          this.options.pkceVerifierCookieName
        )?.value;
        if (!verifier) {
          throw new Error("no pkce verifier cookie found");
        }
        const [resetToken, password] = _extractParams(
          data,
          ["reset_token", "password"],
          "reset_token or password missing"
        );
        const tokenData = await (
          await this.core
        ).resetPasswordWithResetToken(resetToken, verifier, password);
        cookies().set({
          name: this.options.authCookieName,
          value: tokenData.auth_token,
          httpOnly: true,
          sameSite: "strict",
        });
        cookies().delete(this.options.pkceVerifierCookieName);
        return tokenData;
      },
      emailPasswordResendVerificationEmail: async (
        data: FormData | { verification_token: string }
      ) => {
        const [verificationToken] = _extractParams(
          data,
          ["verification_token"],
          "verification_token missing"
        );
        await (await this.core).resendVerificationEmail(verificationToken);
      },
    };
  }
}

export default function createNextAppAuth(
  client: Client,
  options: NextAuthOptions
) {
  return new NextAppAuth(client, options);
}

function _getReqBody(req: NextRequest) {
  return req.headers.get("Content-Type") === "application/json"
    ? req.json()
    : req.formData();
}

function _extractParams(
  data: FormData | Record<string, unknown>,
  paramNames: string[],
  errMessage: string
) {
  const params: string[] = [];
  if (data instanceof FormData) {
    for (const paramName of paramNames) {
      const param = data.get(paramName)?.toString();
      if (!param) {
        throw new Error(errMessage);
      }
      params.push(param);
    }
  } else {
    if (typeof data !== "object") {
      throw new Error("expected json object");
    }
    for (const paramName of paramNames) {
      const param = data[paramName];
      if (!param) {
        throw new Error(errMessage);
      }
      if (typeof param !== "string") {
        throw new Error(`expected '${paramName}' to be a string`);
      }
      params.push(param);
    }
  }
  return params;
}
