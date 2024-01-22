import {
  redirect,
  type Cookies,
  type RequestEvent,
  type ActionFailure,
} from "@sveltejs/kit";
import * as cookie from "cookie";
import type { Client } from "edgedb";
import {
  Auth,
  builtinOAuthProviderNames,
  type BuiltinOAuthProviderNames,
  type TokenData,
  type emailPasswordProviderName,
} from "@edgedb/auth-core";
import { type SvelteAuthOptions, SvelteClientAuth } from "./client.js";

export type { TokenData, SvelteAuthOptions };

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

export default function createServerAuth(
  client: Client,
  options: SvelteAuthOptions
) {
  return new SvelteServerAuth(client, options);
}

type CallbackReturn =
  | (ActionFailure<{ error: string }> | Record<string, unknown>)
  | Promise<ActionFailure<{ error: string }> | Record<string, unknown>>;

type ParamsOrError<Result extends object, ErrorDetails extends object = {}> =
  | ({ error: null } & { [Key in keyof ErrorDetails]?: undefined } & Result)
  | ({ error: Error } & ErrorDetails & { [Key in keyof Result]?: undefined });

export class SvelteAuthSession {
  public readonly client: Client;

  /** @internal */
  constructor(client: Client, private readonly authToken: string | undefined) {
    this.client = this.authToken
      ? client.withGlobals({ "ext::auth::client_token": this.authToken })
      : client;
  }

  async isSignedIn() {
    if (!this.authToken) return false;
    try {
      return await this.client.querySingle<boolean>(
        `select exists global ext::auth::ClientTokenIdentity`
      );
    } catch {
      return false;
    }
  }
}

export interface CreateAuthRouteHandlers {
  onOAuthCallback(
    params: ParamsOrError<{
      tokenData: TokenData;
      provider: BuiltinOAuthProviderNames;
      isSignUp: boolean;
    }>
  ): Promise<Response>;
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
  onEmailVerify(
    params: ParamsOrError<
      { tokenData: TokenData },
      { verificationToken?: string }
    >
  ): Promise<Response>;
  onSignout(): Promise<Response>;
}

export class SvelteServerAuth extends SvelteClientAuth {
  private readonly client: Client;
  private readonly core: Promise<Auth>;

  /** @internal */
  constructor(client: Client, options: SvelteAuthOptions) {
    super(options);

    this.client = client;
    this.core = Auth.create(client);
  }

  isPasswordResetTokenValid(resetToken: string) {
    return Auth.checkPasswordResetTokenValid(resetToken);
  }

  getSession(req: Request) {
    return new SvelteAuthSession(
      this.client,
      parseCookies(req)[this.options.authCookieName]
    );
  }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  createAuthRouteHandlers({
    onOAuthCallback,
    onBuiltinUICallback,
    onEmailVerify,
    onSignout,
  }: Partial<CreateAuthRouteHandlers>) {
    return async ({ request: req, cookies, params }: RequestEvent) => {
      const searchParams = new URL(req.url).searchParams;

      const path = params.auth;

      switch (path) {
        case "oauth": {
          if (!onOAuthCallback) {
            throw new Error(
              `'onOAuthCallback' auth route handler not configured`
            );
          }
          const provider = searchParams.get(
            "provider_name"
          ) as BuiltinOAuthProviderNames | null;
          if (!provider || !builtinOAuthProviderNames.includes(provider)) {
            throw new Error(`invalid provider_name: ${provider}`);
          }
          const redirectUrl = `${this._authRoute}/oauth/callback`;
          const pkceSession = await this.core.then((core) =>
            core.createPKCESession()
          );

          cookies.set(
            this.options.pkceVerifierCookieName,
            pkceSession.verifier,
            { httpOnly: true, path: "/" }
          );
          return redirect(
            303,
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
          const error = searchParams.get("error");
          if (error) {
            const desc = searchParams.get("error_description");
            return onOAuthCallback({
              error: new Error(error + (desc ? `: ${desc}` : "")),
            });
          }
          const code = searchParams.get("code");
          const isSignUp = searchParams.get("isSignUp") === "true";
          const verifier = cookies.get(this.options.pkceVerifierCookieName);
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

          cookies.set(this.options.authCookieName, tokenData.auth_token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
          });

          cookies.set(this.options.pkceVerifierCookieName, "", {
            maxAge: 0,
            path: "/",
          });

          return onOAuthCallback({
            error: null,
            tokenData,
            provider: searchParams.get("provider") as BuiltinOAuthProviderNames,
            isSignUp,
          });
        }

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
          const verifier = cookies.get(this.options.pkceVerifierCookieName);

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

          cookies.set(this.options.authCookieName, tokenData.auth_token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/",
          });

          cookies.set(this.options.pkceVerifierCookieName, "", {
            maxAge: 0,
            path: "/",
          });

          return onBuiltinUICallback({
            error: null,
            tokenData,
            provider: searchParams.get("provider") as BuiltinProviderNames,
            isSignUp,
          });
        }

        case "builtin/signin":
        case "builtin/signup": {
          const pkceSession = await this.core.then((core) =>
            core.createPKCESession()
          );

          cookies.set(
            this.options.pkceVerifierCookieName,
            pkceSession.verifier,
            { httpOnly: true, path: "/" }
          );

          return redirect(
            303,
            path.split("/").pop() === "signup"
              ? pkceSession.getHostedUISignupUrl()
              : pkceSession.getHostedUISigninUrl()
          );
        }

        case "emailpassword/verify": {
          if (!onEmailVerify) {
            throw new Error(
              `'onEmailVerify' auth route handler not configured`
            );
          }
          const verificationToken = searchParams.get("verification_token");
          const verifier = cookies.get(this.options.pkceVerifierCookieName);
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

          cookies.set(this.options.authCookieName, tokenData.auth_token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/",
          });

          return onEmailVerify({
            error: null,
            tokenData,
          });
        }

        case "signout": {
          if (!onSignout) {
            throw new Error(`'onSignout' auth route handler not configured`);
          }
          cookies.delete(this.options.authCookieName, { path: "/" });
          return onSignout();
        }

        default:
          throw new Error("Unknown auth route");
      }
    };
  }

  async emailPasswordSignUp(
    req: Request,
    cookies: Cookies,
    data?: { email: string; password: string }
  ): Promise<{ tokenData: TokenData }>;
  async emailPasswordSignUp(
    req: Request,
    cookies: Cookies,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordSignUp(
    req: Request,
    cookies: Cookies,
    data: { email: string; password: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordSignUp(
    req: Request,
    cookies: Cookies,
    dataOrCb?:
      | { email: string; password: string }
      | ((params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<
    | {
        tokenData: TokenData;
      }
    | CallbackReturn
  > {
    return handleAction(
      async (data, cookies) => {
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

        cookies.set(this.options.pkceVerifierCookieName, result.verifier, {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
        });

        if (result.status === "complete") {
          const tokenData = result.tokenData;

          cookies.set(this.options.authCookieName, tokenData.auth_token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/",
          });

          return { tokenData };
        }

        return { tokenData: null };
      },
      req,
      cookies,
      dataOrCb,
      cb
    );
  }

  async emailPasswordResendVerificationEmail(
    req: Request,
    cookies: Cookies,
    data?: { verification_token: string }
  ): Promise<void>;
  async emailPasswordResendVerificationEmail(
    req: Request,
    cookies: Cookies,
    cb: ({ error }: { error?: Error }) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordResendVerificationEmail(
    req: Request,
    cookies: Cookies,
    data: { verification_token: string },
    cb: ({ error }: { error?: Error }) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordResendVerificationEmail(
    req: Request,
    cookies: Cookies,
    dataOrCb?:
      | { verification_token: string }
      | (({ error }: { error?: Error }) => CallbackReturn),
    cb?: ({ error }: { error?: Error }) => CallbackReturn
  ): Promise<void | CallbackReturn> {
    return handleAction(
      async (data) => {
        const [verificationToken] = _extractParams(
          data,
          ["verification_token"],
          "verification_token missing"
        );

        await (await this.core).resendVerificationEmail(verificationToken);
      },
      req,
      cookies,
      dataOrCb,
      cb
    );
  }

  async emailPasswordSignIn(
    req: Request,
    cookies: Cookies,
    data?: { email: string; password: string }
  ): Promise<{ tokenData: TokenData }>;
  async emailPasswordSignIn(
    req: Request,
    cookies: Cookies,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordSignIn(
    req: Request,
    cookies: Cookies,
    data: { email: string; password: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordSignIn(
    req: Request,
    cookies: Cookies,
    dataOrCb?:
      | { email: string; password: string }
      | ((params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<
    | {
        tokenData: TokenData;
      }
    | CallbackReturn
  > {
    return handleAction(
      async (data, cookies) => {
        const [email, password] = _extractParams(
          data,
          ["email", "password"],
          "email or password missing"
        );

        const tokenData = await (
          await this.core
        ).signinWithEmailPassword(email, password);

        cookies.set(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
        });

        return { tokenData };
      },
      req,
      cookies,
      dataOrCb,
      cb
    );
  }

  async emailPasswordSendPasswordResetEmail(
    req: Request,
    cookies: Cookies,
    data?: { email: string }
  ): Promise<{ tokenData: TokenData }>;
  async emailPasswordSendPasswordResetEmail(
    req: Request,
    cookies: Cookies,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordSendPasswordResetEmail(
    req: Request,
    cookies: Cookies,
    data: { email: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordSendPasswordResetEmail(
    req: Request,
    cookies: Cookies,
    dataOrCb?:
      | { email: string }
      | ((params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<
    | {
        tokenData: TokenData;
      }
    | CallbackReturn
  > {
    return handleAction(
      async (data, cookies) => {
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
        cookies.set(this.options.pkceVerifierCookieName, verifier, {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
        });
      },
      req,
      cookies,
      dataOrCb,
      cb
    );
  }

  async emailPasswordResetPassword(
    req: Request,
    cookies: Cookies,
    data?: { reset_token: string; password: string }
  ): Promise<{ tokenData: TokenData }>;
  async emailPasswordResetPassword(
    req: Request,
    cookies: Cookies,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordResetPassword(
    req: Request,
    cookies: Cookies,
    data: { reset_token: string; password: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<CallbackReturn>;
  async emailPasswordResetPassword(
    req: Request,
    cookies: Cookies,
    dataOrCb?:
      | { reset_token: string; password: string }
      | ((params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => CallbackReturn
  ): Promise<
    | {
        tokenData: TokenData;
      }
    | CallbackReturn
  > {
    return handleAction(
      async (data, cookies) => {
        const verifier = cookies.get(this.options.pkceVerifierCookieName);

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

        cookies.set(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });

        cookies.delete(this.options.pkceVerifierCookieName, {
          path: "/",
        });

        return { tokenData };
      },
      req,
      cookies,
      dataOrCb,
      cb
    );
  }

  async signout(cookies: Cookies): Promise<void>;
  async signout(
    cookies: Cookies,
    cb: () => CallbackReturn
  ): Promise<CallbackReturn>;
  async signout(
    cookies: Cookies,
    cb?: () => CallbackReturn
  ): Promise<void | CallbackReturn> {
    cookies.delete(this.options.authCookieName, { path: "/" });
    if (cb) return cb();
  }
}

function parseCookies(req: Request) {
  const cookies = req.headers.get("Cookie");
  return cookie.parse(cookies || "");
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

async function handleAction(
  action: (
    data: Record<string, string> | FormData,
    cookies: Cookies
  ) => Promise<void | Record<string, TokenData | null>>,
  req: Request,
  cookies: Cookies,
  dataOrCb:
    | Record<string, string>
    | ((data?: any) => CallbackReturn)
    | undefined,
  cb: ((data?: any) => CallbackReturn) | undefined
) {
  const data = typeof dataOrCb === "object" ? dataOrCb : await req.formData();
  const callback = typeof dataOrCb === "function" ? dataOrCb : cb;
  let params;
  let error: Error | null = new Error("mozda err");

  try {
    params = (await action(data, cookies)) || {};
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (callback) {
    return error || params
      ? await callback(error ? { error } : params)
      : await callback();
  } else if (error) {
    throw error;
  }

  return { ...params };
}
