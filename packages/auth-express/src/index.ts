import {
  Auth,
  builtinOAuthProviderNames,
  type emailPasswordProviderName,
  type BuiltinOAuthProviderNames,
  type TokenData,
} from "@edgedb/auth-core";
import type { Client } from "edgedb";
import {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
  Router,
  type NextFunction,
} from "express";

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

export interface ExpressAuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetPath?: string;
}

type OptionalOptions = "passwordResetPath";

export abstract class BaseAuth {
  /** @internal */
  readonly options: Required<Omit<ExpressAuthOptions, OptionalOptions>> &
    Pick<ExpressAuthOptions, OptionalOptions>;

  /** @internal */
  constructor(protected readonly client: Client, options: ExpressAuthOptions) {
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      authRoutesPath: options.authRoutesPath?.replace(/^\/|\/$/g, "") ?? "auth",
      authCookieName: options.authCookieName ?? "edgedb-session",
      pkceVerifierCookieName:
        options.pkceVerifierCookieName ?? "edgedb-pkce-verifier",
      passwordResetPath: options.passwordResetPath,
    };
  }

  protected get _authRoute() {
    return `${this.options.baseUrl}/${this.options.authRoutesPath}`;
  }

  isPasswordResetTokenValid(resetToken: string) {
    return Auth.checkPasswordResetTokenValid(resetToken);
  }

  getOAuthUrl(providerName: BuiltinOAuthProviderNames) {
    return `${this._authRoute}/oauth?${new URLSearchParams({
      provider_name: providerName,
    }).toString()}`;
  }

  getBuiltinUIUrl() {
    return `${this._authRoute}/builtin/signin`;
  }
  getBuiltinUISignUpUrl() {
    return `${this._authRoute}/builtin/signup`;
  }

  getSignoutUrl() {
    return `${this._authRoute}/signout`;
  }
}

export class ExpressAuthSession {
  public readonly client: Client;

  /** @internal */
  constructor(client: Client, private readonly authToken: string | undefined) {
    this.client = this.authToken
      ? client.withGlobals({ "ext::auth::client_token": this.authToken })
      : client;
  }

  async isLoggedIn() {
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

type ParamsOrError<
  Result extends object = Record<never, never>,
  ErrorDetails extends object = Record<never, never>
> =
  | ({ error: null } & { [Key in keyof ErrorDetails]?: undefined } & Result)
  | ({ error: Error } & ErrorDetails & { [Key in keyof Result]?: undefined });

interface CreateAuthRouteHandlers {
  onOAuthCallback(
    params: ParamsOrError<{
      tokenData: TokenData;
      provider: BuiltinOAuthProviderNames;
      isSignUp: boolean;
    }>,
    res: ExpressResponse
  ): void;
  onEmailPasswordSignIn(
    params: ParamsOrError<{ tokenData: TokenData }>,
    res: ExpressResponse
  ): void;
  onEmailPasswordSignUp(
    params: ParamsOrError<{ tokenData: TokenData | null }>,
    res: ExpressResponse
  ): void;
  onEmailPasswordReset(
    params: ParamsOrError<{ tokenData: TokenData }>,
    res: ExpressResponse
  ): void;
  onEmailVerify(
    params: ParamsOrError<
      { tokenData: TokenData },
      { verificationToken?: string }
    >,
    res: ExpressResponse
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
    >,
    res: ExpressResponse
  ): void;
  onSignout(res: ExpressResponse): void;
}

export class ExpressAuth extends BaseAuth {
  private readonly core: Promise<Auth>;

  constructor(client: Client, options: ExpressAuthOptions) {
    super(client, options);
    this.core = Auth.create(client);
  }

  getSession(req: ExpressRequest) {
    const authCookie = req.cookies[this.options.authCookieName];

    return new ExpressAuthSession(this.client, authCookie);
  }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  createMiddleware() {
    return async (
      req: ExpressRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        res.locals.auth = this.getSession(req);
        next();
      } catch (err) {
        next(err);
      }
    };
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
    const router = Router();
    router.get("/oauth", async (req, res, next) => {
      try {
        if (!onOAuthCallback) {
          throw new Error(
            `'onOAuthCallback' auth route handler not configured`
          );
        }
        const provider = new URL(req.url).searchParams.get(
          "provider_name"
        ) as BuiltinOAuthProviderNames | null;
        if (!provider || !builtinOAuthProviderNames.includes(provider)) {
          throw new Error(`invalid provider_name: ${provider}`);
        }
        const redirectUrl = `${this._authRoute}/oauth/callback`;
        const pkceSession = await this.core.then((core) =>
          core.createPKCESession()
        );
        res.cookie(this.options.pkceVerifierCookieName, pkceSession.verifier, {
          httpOnly: true,
        });
        res.redirect(
          pkceSession.getOAuthUrl(
            provider,
            redirectUrl,
            `${redirectUrl}?isSignUp=true`
          )
        );
      } catch (err) {
        next(err);
      }
    });

    router.get("/oauth/callback", async (req, res, next) => {
      try {
        if (!onOAuthCallback) {
          throw new Error(
            `'onOAuthCallback' auth route handler not configured`
          );
        }
        const requestUrl = new URL(req.url);
        const error = requestUrl.searchParams.get("error");
        if (error) {
          const desc = requestUrl.searchParams.get("error_description");
          return onOAuthCallback(
            {
              error: new Error(error + (desc ? `: ${desc}` : "")),
            },
            res
          );
        }
        const code = requestUrl.searchParams.get("code");
        const isSignUp = requestUrl.searchParams.get("isSignUp") === "true";
        const verifier = req.cookies[this.options.pkceVerifierCookieName];
        if (!code) {
          return onOAuthCallback(
            {
              error: new Error("no pkce code in response"),
            },
            res
          );
        }
        if (!verifier) {
          return onOAuthCallback(
            {
              error: new Error("no pkce verifier cookie found"),
            },
            res
          );
        }
        let tokenData: TokenData;
        try {
          tokenData = await (await this.core).getToken(code, verifier);
        } catch (err) {
          return onOAuthCallback(
            {
              error: err instanceof Error ? err : new Error(String(err)),
            },
            res
          );
        }

        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "lax",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);

        return onOAuthCallback(
          {
            error: null,
            tokenData,
            provider: requestUrl.searchParams.get(
              "provider"
            ) as BuiltinOAuthProviderNames,
            isSignUp,
          },
          res
        );
      } catch (err) {
        next(err);
      }
    });

    router.get("/emailpassword/verify", async (req, res, next) => {
      try {
        if (!onEmailVerify) {
          throw new Error(`'onEmailVerify' auth route handler not configured`);
        }
        const requestUrl = new URL(req.url);
        const verificationToken =
          requestUrl.searchParams.get("verification_token");
        const verifier = req.cookies[this.options.pkceVerifierCookieName];
        if (!verificationToken) {
          return onEmailVerify(
            {
              error: new Error("no verification_token in response"),
            },
            res
          );
        }
        if (!verifier) {
          return onEmailVerify(
            {
              error: new Error("no pkce verifier cookie found"),
              verificationToken,
            },
            res
          );
        }
        let tokenData: TokenData;
        try {
          tokenData = await (
            await this.core
          ).verifyEmailPasswordSignup(verificationToken, verifier);
        } catch (err) {
          return onEmailVerify(
            {
              error: err instanceof Error ? err : new Error(String(err)),
              verificationToken,
            },
            res
          );
        }
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);

        return onEmailVerify({ error: null, tokenData }, res);
      } catch (err) {
        next(err);
      }
    });

    router.get("/builtin/callback", async (req, res, next) => {
      try {
        if (!onBuiltinUICallback) {
          throw new Error(
            `'onBuiltinUICallback' auth route handler not configured`
          );
        }
        const requestUrl = new URL(req.url);
        const error = requestUrl.searchParams.get("error");
        if (error) {
          const desc = requestUrl.searchParams.get("error_description");
          return onBuiltinUICallback(
            {
              error: new Error(error + (desc ? `: ${desc}` : "")),
            },
            res
          );
        }
        const code = requestUrl.searchParams.get("code");
        const verificationEmailSentAt = requestUrl.searchParams.get(
          "verification_email_sent_at"
        );

        if (!code) {
          if (verificationEmailSentAt) {
            return onBuiltinUICallback(
              {
                error: null,
                tokenData: null,
                provider: null,
                isSignUp: true,
              },
              res
            );
          }
          return onBuiltinUICallback(
            {
              error: new Error("no pkce code in response"),
            },
            res
          );
        }
        const verifier = req.cookies[this.options.pkceVerifierCookieName];
        if (!verifier) {
          return onBuiltinUICallback(
            {
              error: new Error("no pkce verifier cookie found"),
            },
            res
          );
        }
        const isSignUp = requestUrl.searchParams.get("isSignUp") === "true";
        let tokenData: TokenData;
        try {
          tokenData = await (await this.core).getToken(code, verifier);
        } catch (err) {
          return onBuiltinUICallback(
            {
              error: err instanceof Error ? err : new Error(String(err)),
            },
            res
          );
        }
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "lax",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);

        return onBuiltinUICallback(
          {
            error: null,
            tokenData,
            provider: requestUrl.searchParams.get(
              "provider"
            ) as BuiltinProviderNames,
            isSignUp,
          },
          res
        );
      } catch (err) {
        next(err);
      }
    });

    router.get("/builtin/signin", async (_, res, next) => {
      try {
        const pkceSession = await this.core.then((core) =>
          core.createPKCESession()
        );
        res.cookie(this.options.pkceVerifierCookieName, pkceSession.verifier, {
          httpOnly: true,
        });
        res.redirect(pkceSession.getHostedUISigninUrl());
      } catch (err) {
        next(err);
      }
    });

    router.get("/builtin/signup", async (_, res, next) => {
      try {
        const pkceSession = await this.core.then((core) =>
          core.createPKCESession()
        );
        res.cookie(this.options.pkceVerifierCookieName, pkceSession.verifier, {
          httpOnly: true,
        });
        res.redirect(pkceSession.getHostedUISignupUrl());
      } catch (err) {
        next(err);
      }
    });

    router.get("/signout", async (_, res, next) => {
      try {
        if (!onSignout) {
          throw new Error(`'onSignout' auth route handler not configured`);
        }
        res.clearCookie(this.options.authCookieName);
        return onSignout(res);
      } catch (err) {
        next(err);
      }
    });

    router.post("/emailpassword/signin", async (req, res, next) => {
      try {
        if (!onEmailPasswordSignIn) {
          throw new Error(
            `'onEmailPasswordSignIn' auth route handler not configured`
          );
        }
        let tokenData: TokenData;
        try {
          const [email, password] = _extractParams(
            req.body,
            ["email", "password"],
            "email or password missing from request body"
          );
          tokenData = await (
            await this.core
          ).signinWithEmailPassword(email, password);
        } catch (err) {
          return onEmailPasswordSignIn(
            {
              error: err instanceof Error ? err : new Error(String(err)),
            },
            res
          );
        }
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
        });
        return onEmailPasswordSignIn({ error: null, tokenData }, res);
      } catch (err) {
        next(err);
      }
    });

    router.post("/emailpassword/signup", async (req, res, next) => {
      try {
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
            req.body,
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
          return onEmailPasswordSignUp(
            {
              error: err instanceof Error ? err : new Error(String(err)),
            },
            res
          );
        }
        res.cookie(this.options.pkceVerifierCookieName, result.verifier, {
          httpOnly: true,
          sameSite: "strict",
        });
        if (result.status === "complete") {
          res.cookie(this.options.authCookieName, result.tokenData.auth_token, {
            httpOnly: true,
            sameSite: "strict",
          });
          return onEmailPasswordSignUp(
            {
              error: null,
              tokenData: result.tokenData,
            },
            res
          );
        } else {
          return onEmailPasswordSignUp({ error: null, tokenData: null }, res);
        }
      } catch (err) {
        next(err);
      }
    });

    router.post("/emailpassword/send-reset-email", async (req, res, next) => {
      try {
        if (!this.options.passwordResetPath) {
          throw new Error(`'passwordResetPath' option not configured`);
        }
        const [email] = _extractParams(
          req.body,
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
        res.cookie(this.options.pkceVerifierCookieName, verifier, {
          httpOnly: true,
          sameSite: "strict",
        });
        res.status(204);
      } catch (err) {
        next(err);
      }
    });
    router.post("/emailpassword/reset-password", async (req, res, next) => {
      try {
        if (!onEmailPasswordReset) {
          throw new Error(
            `'onEmailPasswordReset' auth route handler not configured`
          );
        }
        let tokenData: TokenData;
        try {
          const verifier = req.cookies[this.options.pkceVerifierCookieName];
          if (!verifier) {
            return onEmailPasswordReset(
              {
                error: new Error("no pkce verifier cookie found"),
              },
              res
            );
          }
          const [resetToken, password] = _extractParams(
            req.body,
            ["reset_token", "password"],
            "reset_token or password missing from request body"
          );

          tokenData = await (
            await this.core
          ).resetPasswordWithResetToken(resetToken, verifier, password);
        } catch (err) {
          return onEmailPasswordReset(
            {
              error: err instanceof Error ? err : new Error(String(err)),
            },
            res
          );
        }
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);
        return onEmailPasswordReset({ error: null, tokenData }, res);
      } catch (err) {
        next(err);
      }
    });
    router.post(
      "/emailpassword/resend-verification-email",
      async (req, res, next) => {
        try {
          const [verificationToken] = _extractParams(
            req.body,
            ["verification_token"],
            "verification_token missing from request body"
          );
          (await this.core).resendVerificationEmail(verificationToken);
          res.status(204);
        } catch (err) {
          next(err);
        }
      }
    );

    return router;
  }

  async signout(res: ExpressResponse) {
    res.clearCookie(this.options.authCookieName, {
      httpOnly: true,
      sameSite: "strict",
    });
  }

  async emailPasswordSignIn(
    res: ExpressResponse,
    { email, password }: { email: string; password: string }
  ) {
    const tokenData = await (
      await this.core
    ).signinWithEmailPassword(email, password);
    res.cookie(this.options.authCookieName, tokenData.auth_token, {
      httpOnly: true,
      sameSite: "strict",
    });
    return tokenData;
  }

  async emailPasswordSignUp(
    res: ExpressResponse,
    { email, password }: { email: string; password: string }
  ) {
    const result = await (
      await this.core
    ).signupWithEmailPassword(
      email,
      password,
      `${this._authRoute}/emailpassword/verify`
    );
    res.cookie(this.options.pkceVerifierCookieName, result.verifier, {
      httpOnly: true,
      sameSite: "strict",
    });
    if (result.status === "complete") {
      res.cookie(this.options.authCookieName, result.tokenData.auth_token, {
        httpOnly: true,
        sameSite: "strict",
      });
      return result.tokenData;
    }
    return null;
  }

  async emailPasswordSendPasswordResetEmail({ email }: { email: string }) {
    if (!this.options.passwordResetPath) {
      throw new Error(`'passwordResetPath' option not configured`);
    }
    return (await this.core).sendPasswordResetEmail(
      email,
      new URL(this.options.passwordResetPath, this.options.baseUrl).toString()
    );
  }

  async emailPasswordResetPassword(
    req: ExpressRequest,
    res: ExpressResponse,
    { reset_token, password }: { reset_token: string; password: string }
  ) {
    const verifier = req.cookies[this.options.pkceVerifierCookieName];
    if (!verifier) {
      throw new Error("no pkce verifier cookie found");
    }
    const tokenData = await (
      await this.core
    ).resetPasswordWithResetToken(reset_token, verifier, password);
    res.cookie(this.options.authCookieName, tokenData.auth_token, {
      httpOnly: true,
      sameSite: "strict",
    });
    res.clearCookie(this.options.pkceVerifierCookieName);
    return tokenData;
  }

  async emailPasswordResendVerificationEmail({
    verification_token,
  }: {
    verification_token: string;
  }) {
    return (await this.core).resendVerificationEmail(verification_token);
  }
}

export default function createExpressAuth(
  client: Client,
  options: ExpressAuthOptions
) {
  return new ExpressAuth(client, options);
}

function _extractParams(
  data: Record<string, unknown>,
  paramNames: string[],
  errMessage: string
) {
  const params: string[] = [];
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
  return params;
}
