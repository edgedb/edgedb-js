import { type Client } from "edgedb";
import {
  Auth,
  builtinOAuthProviderNames,
  type BuiltinOAuthProviderNames,
  type TokenData,
  ConfigurationError,
  InvalidDataError,
  PKCEError,
  EdgeDBAuthError,
} from "@edgedb/auth-core";

import {
  type BuiltinProviderNames,
  NextAuthHelpers,
  type NextAuthOptions,
} from "./shared.client";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export { type BuiltinProviderNames, NextAuthHelpers, type NextAuthOptions };

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
  ): Promise<never>;
  onEmailPasswordSignIn(
    params: ParamsOrError<{ tokenData: TokenData }>
  ): Promise<Response>;
  onEmailPasswordSignUp(
    params: ParamsOrError<{ tokenData: TokenData | null }>
  ): Promise<Response>;
  onEmailPasswordReset(
    params: ParamsOrError<{ tokenData: TokenData }>
  ): Promise<Response>;
  onEmailVerify(
    params: ParamsOrError<
      { tokenData: TokenData },
      { verificationToken?: string }
    >
  ): Promise<never>;
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
  ): Promise<never>;
  onSignout(): Promise<never>;
}

export abstract class NextAuth extends NextAuthHelpers {
  protected readonly core: Promise<Auth>;

  /** @internal */
  constructor(protected readonly client: Client, options: NextAuthOptions) {
    super(options);
    this.core = Auth.create(client);
  }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  isPasswordResetTokenValid(resetToken: string) {
    return Auth.checkPasswordResetTokenValid(resetToken);
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
              throw new ConfigurationError(
                `'onOAuthCallback' auth route handler not configured`
              );
            }
            const provider = req.nextUrl.searchParams.get(
              "provider_name"
            ) as BuiltinOAuthProviderNames | null;
            if (!provider || !builtinOAuthProviderNames.includes(provider)) {
              throw new InvalidDataError(`invalid provider_name: ${provider}`);
            }
            const redirectUrl = `${this._authRoute}/oauth/callback`;
            const pkceSession = await this.core.then((core) =>
              core.createPKCESession()
            );
            cookies().set({
              name: this.options.pkceVerifierCookieName,
              value: pkceSession.verifier,
              httpOnly: true,
              path: "/",
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
              throw new ConfigurationError(
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
              path: "/",
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
              throw new ConfigurationError(
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
              path: "/",
            });
            cookies().delete(this.options.pkceVerifierCookieName);

            return onEmailVerify({ error: null, tokenData });
          }
          case "builtin/callback": {
            if (!onBuiltinUICallback) {
              throw new ConfigurationError(
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
              path: "/",
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
              path: "/",
            });
            return redirect(
              params.auth[params.auth.length - 1] === "signup"
                ? pkceSession.getHostedUISignupUrl()
                : pkceSession.getHostedUISigninUrl()
            );
          }
          case "signout": {
            if (!onSignout) {
              throw new ConfigurationError(
                `'onSignout' auth route handler not configured`
              );
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
            const data = await _getReqBody(req);
            const isAction = _isAction(data);
            if (!isAction && !onEmailPasswordSignIn) {
              throw new ConfigurationError(
                `'onEmailPasswordSignIn' auth route handler not configured`
              );
            }
            let tokenData: TokenData;
            try {
              const [email, password] = _extractParams(
                data,
                ["email", "password"],
                "email or password missing from request body"
              );
              tokenData = await (
                await this.core
              ).signinWithEmailPassword(email, password);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              return onEmailPasswordSignIn
                ? _wrapResponse(onEmailPasswordSignIn({ error }), isAction)
                : Response.json(_wrapError(error));
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "strict",
              path: "/",
            });
            return _wrapResponse(
              onEmailPasswordSignIn?.({ error: null, tokenData }),
              isAction
            );
          }
          case "emailpassword/signup": {
            const data = await _getReqBody(req);
            const isAction = _isAction(data);
            if (!isAction && !onEmailPasswordSignUp) {
              throw new ConfigurationError(
                `'onEmailPasswordSignUp' auth route handler not configured`
              );
            }
            let result: Awaited<
              ReturnType<Awaited<typeof this.core>["signupWithEmailPassword"]>
            >;
            try {
              const [email, password] = _extractParams(
                data,
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
              const error = err instanceof Error ? err : new Error(String(err));
              return onEmailPasswordSignUp
                ? _wrapResponse(onEmailPasswordSignUp({ error }), isAction)
                : Response.json(_wrapError(error));
            }
            cookies().set({
              name: this.options.pkceVerifierCookieName,
              value: result.verifier,
              httpOnly: true,
              sameSite: "strict",
              path: "/",
            });
            if (result.status === "complete") {
              cookies().set({
                name: this.options.authCookieName,
                value: result.tokenData.auth_token,
                httpOnly: true,
                sameSite: "strict",
                path: "/",
              });
              return _wrapResponse(
                onEmailPasswordSignUp?.({
                  error: null,
                  tokenData: result.tokenData,
                }),
                isAction
              );
            } else {
              return _wrapResponse(
                onEmailPasswordSignUp?.({ error: null, tokenData: null }),
                isAction
              );
            }
          }
          case "emailpassword/send-reset-email": {
            if (!this.options.passwordResetPath) {
              throw new ConfigurationError(
                `'passwordResetPath' option not configured`
              );
            }
            const data = await _getReqBody(req);
            const isAction = _isAction(data);
            const [email] = _extractParams(
              data,
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
              path: "/",
            });
            return isAction
              ? Response.json({ _data: null })
              : new Response(null, { status: 204 });
          }
          case "emailpassword/reset-password": {
            const data = await _getReqBody(req);
            const isAction = _isAction(data);
            if (!isAction && !onEmailPasswordReset) {
              throw new ConfigurationError(
                `'onEmailPasswordReset' auth route handler not configured`
              );
            }
            let tokenData: TokenData;
            try {
              const verifier = req.cookies.get(
                this.options.pkceVerifierCookieName
              )?.value;
              if (!verifier) {
                throw new PKCEError("no pkce verifier cookie found");
              }
              const [resetToken, password] = _extractParams(
                data,
                ["reset_token", "password"],
                "reset_token or password missing from request body"
              );

              tokenData = await (
                await this.core
              ).resetPasswordWithResetToken(resetToken, verifier, password);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              return onEmailPasswordReset
                ? _wrapResponse(onEmailPasswordReset({ error }), isAction)
                : Response.json(_wrapError(error));
            }
            cookies().set({
              name: this.options.authCookieName,
              value: tokenData.auth_token,
              httpOnly: true,
              sameSite: "strict",
              path: "/",
            });
            cookies().delete(this.options.pkceVerifierCookieName);
            return _wrapResponse(
              onEmailPasswordReset?.({ error: null, tokenData }),
              isAction
            );
          }
          case "emailpassword/resend-verification-email": {
            const data = await _getReqBody(req);
            const isAction = _isAction(data);
            const [verificationToken] = _extractParams(
              data,
              ["verification_token"],
              "verification_token missing from request body"
            );
            (await this.core).resendVerificationEmail(verificationToken);
            return isAction
              ? Response.json({ _data: null })
              : new Response(null, { status: 204 });
          }
          default:
            return new Response("Unknown auth route", {
              status: 404,
            });
        }
      },
    };
  }
}

export class NextAuthSession {
  public readonly client: Client;

  /** @internal */
  constructor(client: Client, public readonly authToken: string | null) {
    this.client = this.authToken
      ? client.withGlobals({ "ext::auth::client_token": this.authToken })
      : client;
  }

  private _isSignedIn: Promise<boolean> | null = null;
  async isSignedIn(): Promise<boolean> {
    if (!this.authToken) return false;
    return (
      this._isSignedIn ??
      (this._isSignedIn = this.client
        .queryRequiredSingle<boolean>(
          `select exists global ext::auth::ClientTokenIdentity`
        )
        .catch(() => false))
    );
  }
}

function _getReqBody(req: NextRequest) {
  return req.headers.get("Content-Type") === "application/json"
    ? req.json()
    : req.formData();
}

function _isAction(data: any) {
  return typeof data === "object" && data._action === true;
}

export function _extractParams(
  data: FormData | Record<string, unknown>,
  paramNames: string[],
  errMessage: string
) {
  const params: string[] = [];
  if (data instanceof FormData) {
    for (const paramName of paramNames) {
      const param = data.get(paramName)?.toString();
      if (!param) {
        throw new InvalidDataError(errMessage);
      }
      params.push(param);
    }
  } else {
    if (typeof data !== "object") {
      throw new InvalidDataError("expected json object");
    }
    for (const paramName of paramNames) {
      const param = data[paramName];
      if (!param) {
        throw new InvalidDataError(errMessage);
      }
      if (typeof param !== "string") {
        throw new InvalidDataError(`expected '${paramName}' to be a string`);
      }
      params.push(param);
    }
  }
  return params;
}

function _wrapResponse(res: Promise<Response> | undefined, isAction: boolean) {
  if (isAction) {
    return (
      res
        ?.then(async (res) => Response.json({ _data: await res.json() }))
        .catch((err) => {
          return Response.json(_isRedirect(err) || _wrapError(err));
        }) ?? Response.json({ _data: null })
    );
  }
  return res;
}

function _wrapError(err: Error) {
  return {
    _error: {
      type: err instanceof EdgeDBAuthError ? err.type : null,
      message: err instanceof Error ? err.message : String(err),
    },
  };
}

function _isRedirect(error: any) {
  if (
    !(error instanceof Error) ||
    error.message !== "NEXT_REDIRECT" ||
    typeof (error as any).digest !== "string"
  ) {
    return false;
  }
  const [_, type, location] = ((error as any).digest as string).split(";");
  return { _redirect: { location, replace: type === "replace" } };
}
