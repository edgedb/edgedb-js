import {
  Auth,
  builtinOAuthProviderNames,
  type emailPasswordProviderName,
  type BuiltinOAuthProviderNames,
  type TokenData,
  InvalidDataError,
  OAuthProviderFailureError,
  PKCEError,
  EdgeDBAuthError,
} from "@edgedb/auth-core";
import type { Client } from "edgedb";
import {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
  type NextFunction,
  Router,
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";

type RouterStack = (RequestHandler | ErrorRequestHandler)[];

export * from "@edgedb/auth-core/dist/errors.js";

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

export interface SessionRequest extends ExpressRequest {
  session?: ExpressAuthSession;
}

export interface TokenDataRequest extends ExpressRequest {
  tokenData?: TokenData;
}

export interface AuthRequest extends SessionRequest, TokenDataRequest {}

export interface CallbackRequest extends AuthRequest {
  provider?: BuiltinOAuthProviderNames;
  isSignUp?: boolean;
}

export class ExpressAuthSession {
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

export interface ExpressAuthOptions {
  baseUrl: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
}

export class ExpressAuth {
  private readonly options: Required<ExpressAuthOptions>;
  private readonly core: Promise<Auth>;

  constructor(protected readonly client: Client, options: ExpressAuthOptions) {
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      authCookieName: options.authCookieName ?? "edgedb-session",
      pkceVerifierCookieName:
        options.pkceVerifierCookieName ?? "edgedb-pkce-verifier",
    };
    this.core = Auth.create(client);
  }

  isPasswordResetTokenValid = (resetToken: string) => {
    return Auth.checkPasswordResetTokenValid(resetToken);
  };

  getSession = (req: ExpressRequest) => {
    const authCookie = req.cookies[this.options.authCookieName];

    return new ExpressAuthSession(this.client, authCookie);
  };

  getProvidersInfo = async () => {
    return (await this.core).getProvidersInfo();
  };

  createSessionMiddleware = () => {
    return async (
      req: SessionRequest,
      _: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        req.session = this.getSession(req);
        next();
      } catch (err) {
        next(err);
      }
    };
  };

  createBuiltinRouter = ({ callback }: { callback: RouterStack }) => {
    const router = Router();

    router.get("/signin", this.builtin.signIn);
    router.get("/signup", this.builtin.signUp);
    router.get("/callback", this.builtin.callback, ...callback);

    return router;
  };

  createEmailPasswordRouter = (
    routerPath: string,
    resetPasswordPath: string,
    stacks: Record<keyof typeof this.emailPassword, RouterStack>
  ) => {
    const router = Router();

    router.post("/signin", this.emailPassword.signIn, ...stacks.signIn);
    router.post(
      "/signup",
      this.emailPassword.signUp(
        new URL(`${routerPath}/verify`, this.options.baseUrl).toString()
      ),
      ...stacks.signUp
    );
    router.get("/verify", this.emailPassword.verify, ...stacks.verify);
    router.post(
      "/send-password-reset-email",
      this.emailPassword.sendPasswordResetEmail(
        new URL(resetPasswordPath, this.options.baseUrl).toString()
      ),
      ...stacks.sendPasswordResetEmail
    );
    router.post(
      "/reset-password",
      this.emailPassword.resetPassword,
      ...stacks.resetPassword
    );
    router.post(
      "/resend-verification-email",
      this.emailPassword.resendVerificationEmail,
      ...stacks.resendVerificationEmail
    );

    return Router().use(routerPath, router);
  };

  createOAuthRouter = (
    routerPath: string,
    {
      callback,
    }: {
      callback: RouterStack;
    }
  ) => {
    const router = Router();

    router.get(
      "/",
      this.oAuth.redirect(
        new URL(`${routerPath}/callback`, this.options.baseUrl).toString()
      )
    );
    router.get("/callback", this.oAuth.callback, ...callback);

    return Router().use(routerPath, router);
  };

  signout = async (
    req: AuthRequest,
    res: ExpressResponse,
    next: NextFunction
  ) => {
    try {
      res.clearCookie(this.options.authCookieName, {
        httpOnly: true,
        sameSite: "strict",
      });
      req.session = new ExpressAuthSession(this.client, undefined);
      req.tokenData = undefined;
      next();
    } catch (err) {
      next(err);
    }
  };

  oAuth = {
    redirect:
      (callbackUrl: string) =>
      async (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
        try {
          const searchParams = new URLSearchParams(req.url.split("?")[1]);
          const provider = searchParams.get(
            "provider_name"
          ) as BuiltinOAuthProviderNames | null;
          if (!provider || !builtinOAuthProviderNames.includes(provider)) {
            throw new InvalidDataError(`invalid provider_name: ${provider}`);
          }
          const pkceSession = await this.core.then((core) =>
            core.createPKCESession()
          );
          res.cookie(
            this.options.pkceVerifierCookieName,
            pkceSession.verifier,
            {
              httpOnly: true,
            }
          );
          res.redirect(
            pkceSession.getOAuthUrl(
              provider,
              callbackUrl,
              `${callbackUrl}?isSignUp=true`
            )
          );
        } catch (err) {
          next(err);
        }
      },

    callback: async (
      req: CallbackRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        const searchParams = new URLSearchParams(req.url.split("?")[1]);
        const error = searchParams.get("error");
        if (error) {
          const desc = searchParams.get("error_description");
          throw new OAuthProviderFailureError(
            error + (desc ? `: ${desc}` : "")
          );
        }
        const code = searchParams.get("code");
        const verificationEmailSentAt = searchParams.get(
          "verification_email_sent_at"
        );

        if (!code) {
          if (verificationEmailSentAt) {
            req.session = new ExpressAuthSession(this.client, undefined);
            req.isSignUp = true;
          }
          throw new PKCEError("no pkce code in response");
        }
        const verifier = req.cookies[this.options.pkceVerifierCookieName];
        if (!verifier) {
          throw new PKCEError("no pkce verifier cookie found");
        }
        const isSignUp = searchParams.get("isSignUp") === "true";
        const tokenData = await (await this.core).getToken(code, verifier);
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "lax",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);

        req.session = new ExpressAuthSession(this.client, tokenData.auth_token);
        req.tokenData = tokenData;
        req.isSignUp = isSignUp;
        req.provider = searchParams.get(
          "provider"
        ) as BuiltinOAuthProviderNames;
        next();
      } catch (err) {
        next(err);
      }
    },
  };

  builtin = {
    signIn: async (
      _: AuthRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
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
    },
    signUp: async (
      _: AuthRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
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
    },
    callback: async (
      req: CallbackRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        const searchParams = new URLSearchParams(req.url.split("?")[1]);
        const error = searchParams.get("error");
        if (error) {
          const desc = searchParams.get("error_description");
          throw new EdgeDBAuthError(error + (desc ? `: ${desc}` : ""));
        }
        const code = searchParams.get("code");
        const verificationEmailSentAt = searchParams.get(
          "verification_email_sent_at"
        );

        if (!code) {
          if (verificationEmailSentAt) {
            req.session = new ExpressAuthSession(this.client, undefined);
            req.isSignUp = true;
          }
          throw new PKCEError("no pkce code in response");
        }
        const verifier = req.cookies[this.options.pkceVerifierCookieName];
        if (!verifier) {
          throw new PKCEError("no pkce verifier cookie found");
        }
        const isSignUp = searchParams.get("isSignUp") === "true";
        const tokenData = await (await this.core).getToken(code, verifier);
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "lax",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);

        req.session = new ExpressAuthSession(this.client, tokenData.auth_token);
        req.tokenData = tokenData;
        req.isSignUp = isSignUp;
        req.provider = searchParams.get(
          "provider"
        ) as BuiltinOAuthProviderNames;
        next();
      } catch (err) {
        next(err);
      }
    },
  };

  emailPassword = {
    signIn: async (
      req: AuthRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        const [email, password] = _extractParams(
          req.body,
          ["email", "password"],
          "email or password missing from request body"
        );
        const tokenData = await (
          await this.core
        ).signinWithEmailPassword(email, password);
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
        });
        req.session = new ExpressAuthSession(this.client, tokenData.auth_token);
        req.tokenData = tokenData;
        next();
      } catch (err) {
        next(err);
      }
    },
    signUp:
      (verifyUrl: string) =>
      async (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
        try {
          const [email, password] = _extractParams(
            req.body,
            ["email", "password"],
            "email or password missing from request body"
          );
          const result = await (
            await this.core
          ).signupWithEmailPassword(email, password, verifyUrl);
          res.cookie(this.options.pkceVerifierCookieName, result.verifier, {
            httpOnly: true,
            sameSite: "strict",
          });
          if (result.status === "complete") {
            res.cookie(
              this.options.authCookieName,
              result.tokenData.auth_token,
              {
                httpOnly: true,
                sameSite: "strict",
              }
            );
            req.session = new ExpressAuthSession(
              this.client,
              result.tokenData.auth_token
            );
            req.tokenData = result.tokenData;
          } else {
            req.session = new ExpressAuthSession(this.client, undefined);
          }
          next();
        } catch (err) {
          next(err);
        }
      },
    verify: async (
      req: AuthRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        const searchParams = new URLSearchParams(req.url.split("?")[1]);
        const verificationToken = searchParams.get("verification_token");
        const verifier = req.cookies[this.options.pkceVerifierCookieName];
        if (!verificationToken) {
          throw new PKCEError("no verification_token in response");
        }
        if (!verifier) {
          throw new PKCEError("no pkce verifier cookie found");
        }
        const tokenData = await (
          await this.core
        ).verifyEmailPasswordSignup(verificationToken, verifier);
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);

        req.session = new ExpressAuthSession(this.client, tokenData.auth_token);
        req.tokenData = tokenData;
        next();
      } catch (err) {
        next(err);
      }
    },
    sendPasswordResetEmail:
      (passwordResetUrl: string) =>
      async (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
        try {
          const [email] = _extractParams(
            req.body,
            ["email"],
            "email missing from request body"
          );
          const { verifier } = await (
            await this.core
          ).sendPasswordResetEmail(email, passwordResetUrl);
          res.cookie(this.options.pkceVerifierCookieName, verifier, {
            httpOnly: true,
            sameSite: "strict",
          });
          res.status(204);
          next();
        } catch (err) {
          next(err);
        }
      },
    resetPassword: async (
      req: AuthRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        const verifier = req.cookies[this.options.pkceVerifierCookieName];
        if (!verifier) {
          throw new PKCEError("no pkce verifier cookie found");
        }
        const [resetToken, password] = _extractParams(
          req.body,
          ["reset_token", "password"],
          "reset_token or password missing from request body"
        );

        const tokenData = await (
          await this.core
        ).resetPasswordWithResetToken(resetToken, verifier, password);
        res.cookie(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
        });
        res.clearCookie(this.options.pkceVerifierCookieName);
        req.session = new ExpressAuthSession(this.client, tokenData.auth_token);
        req.tokenData = tokenData;
        next();
      } catch (err) {
        next(err);
      }
    },
    resendVerificationEmail: async (
      req: AuthRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => {
      try {
        const [verificationToken] = _extractParams(
          req.body,
          ["verification_token"],
          "verification_token missing from request body"
        );
        (await this.core).resendVerificationEmail(verificationToken);
        res.status(204);
        next();
      } catch (err) {
        next(err);
      }
    },
  };
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
  return params;
}
