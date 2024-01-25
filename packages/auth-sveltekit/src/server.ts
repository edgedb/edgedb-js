import {
  redirect,
  type Cookies,
  type RequestEvent,
  type Handle,
} from "@sveltejs/kit";
import type { Client } from "edgedb";
import {
  Auth,
  builtinOAuthProviderNames,
  type BuiltinOAuthProviderNames,
  type TokenData,
  type emailPasswordProviderName,
} from "@edgedb/auth-core";
import {
  SvelteClientAuth,
  getConfig,
  type SvelteAuthConfig,
  type SvelteAuthOptions,
} from "./client.js";

export type { TokenData, SvelteAuthOptions, Client };

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

type ParamsOrError<Result extends object, ErrorDetails extends object = {}> =
  | ({ error: null } & { [Key in keyof ErrorDetails]?: undefined } & Result)
  | ({ error: Error } & ErrorDetails & { [Key in keyof Result]?: undefined });

export interface AuthRouteHandlers {
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

export default function createServerAuth(
  client: Client,
  options: SvelteAuthOptions
) {
  const core = Auth.create(client);
  const config = getConfig(options);

  return {
    createServerAuth: ({ event }: { event: RequestEvent }) =>
      new SvelteServerAuth(client, core, event, options),
    createAuthRouteHook:
      (handlers: AuthRouteHandlers): Handle =>
      ({ event, resolve }) => {
        const pathname = new URL(event.request.url).pathname;

        if (pathname.startsWith(`/${config.authRoutesPath}`)) {
          return createAuthRouteHandlers(handlers, event, core, config);
        }

        return resolve(event);
      },
  };
}

async function createAuthRouteHandlers(
  {
    onOAuthCallback,
    onBuiltinUICallback,
    onEmailVerify,
    onSignout,
  }: Partial<AuthRouteHandlers>,
  event: RequestEvent,
  core: Promise<Auth>,
  config: SvelteAuthConfig
) {
  const url = new URL(event.request.url);
  const searchParams = url.searchParams;
  const path = url.pathname.split("/").slice(2).join("/");
  const cookies = event.cookies;

  switch (path) {
    case "oauth": {
      if (!onOAuthCallback) {
        throw new Error(`'onOAuthCallback' auth route handler not configured`);
      }
      const provider = searchParams.get(
        "provider_name"
      ) as BuiltinOAuthProviderNames | null;
      if (!provider || !builtinOAuthProviderNames.includes(provider)) {
        throw new Error(`invalid provider_name: ${provider}`);
      }
      const redirectUrl = `${config.authRoute}/oauth/callback`;
      const pkceSession = await core.then((core) => core.createPKCESession());

      cookies.set(config.pkceVerifierCookieName, pkceSession.verifier, {
        httpOnly: true,
        path: "/",
      });
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
        throw new Error(`'onOAuthCallback' auth route handler not configured`);
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
      const verifier = cookies.get(config.pkceVerifierCookieName);
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
        tokenData = await (await core).getToken(code, verifier);
      } catch (err) {
        return onOAuthCallback({
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }

      cookies.set(config.authCookieName, tokenData.auth_token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });

      cookies.set(config.pkceVerifierCookieName, "", {
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
      const verifier = cookies.get(config.pkceVerifierCookieName);

      if (!verifier) {
        return onBuiltinUICallback({
          error: new Error("no pkce verifier cookie found"),
        });
      }
      const isSignUp = searchParams.get("isSignUp") === "true";
      let tokenData: TokenData;
      try {
        tokenData = await (await core).getToken(code, verifier);
      } catch (err) {
        return onBuiltinUICallback({
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }

      cookies.set(config.authCookieName, tokenData.auth_token, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });

      cookies.set(config.pkceVerifierCookieName, "", {
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
      const pkceSession = await core.then((core) => core.createPKCESession());

      cookies.set(config.pkceVerifierCookieName, pkceSession.verifier, {
        httpOnly: true,
        path: "/",
      });

      return redirect(
        303,
        path.split("/").pop() === "signup"
          ? pkceSession.getHostedUISignupUrl()
          : pkceSession.getHostedUISigninUrl()
      );
    }

    case "emailpassword/verify": {
      if (!onEmailVerify) {
        throw new Error(`'onEmailVerify' auth route handler not configured`);
      }
      const verificationToken = searchParams.get("verification_token");
      const verifier = cookies.get(config.pkceVerifierCookieName);
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
          await core
        ).verifyEmailPasswordSignup(verificationToken, verifier);
      } catch (err) {
        return onEmailVerify({
          error: err instanceof Error ? err : new Error(String(err)),
          verificationToken,
        });
      }

      cookies.set(config.authCookieName, tokenData.auth_token, {
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
      cookies.delete(config.authCookieName, { path: "/" });
      return onSignout();
    }

    default:
      throw new Error("Unknown auth route");
  }
}

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

export class SvelteServerAuth extends SvelteClientAuth {
  private readonly client: Client;
  private readonly core: Promise<Auth>;
  private readonly cookies: Cookies;

  public get session() {
    return new SvelteAuthSession(
      this.client,
      this.cookies.get(this.config.authCookieName)
    );
  }

  /** @internal */
  constructor(
    client: Client,
    core: Promise<Auth>,
    { cookies }: RequestEvent,
    options: SvelteAuthOptions
  ) {
    super(options);

    this.client = client;
    this.core = core;
    this.cookies = cookies;
  }

  isPasswordResetTokenValid(resetToken: string) {
    return Auth.checkPasswordResetTokenValid(resetToken);
  }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  async emailPasswordSignUp({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{ tokenData?: TokenData | null }> {
    const result = await (
      await this.core
    ).signupWithEmailPassword(
      email,
      password,
      `${this.config.authRoute}/emailpassword/verify`
    );

    this.cookies.set(this.config.pkceVerifierCookieName, result.verifier, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });

    if (result.status === "complete") {
      const tokenData = result.tokenData;

      this.cookies.set(this.config.authCookieName, tokenData.auth_token, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });

      return { tokenData };
    }

    return { tokenData: null };
  }

  async emailPasswordResendVerificationEmail({
    verificationToken,
  }: {
    verificationToken: string;
  }): Promise<void> {
    await (await this.core).resendVerificationEmail(verificationToken);
  }

  async emailPasswordSignIn({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{ tokenData?: TokenData; error?: Error }> {
    const tokenData = await (
      await this.core
    ).signinWithEmailPassword(email, password);

    this.cookies.set(this.config.authCookieName, tokenData.auth_token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });

    return { tokenData };
  }

  async emailPasswordSendPasswordResetEmail({
    email,
  }: {
    email: string;
  }): Promise<void> {
    if (!this.config.passwordResetPath) {
      throw new Error(`'passwordResetPath' option not configured`);
    }

    const { verifier } = await (
      await this.core
    ).sendPasswordResetEmail(
      email,
      new URL(this.config.passwordResetPath, this.config.baseUrl).toString()
    );

    this.cookies.set(this.config.pkceVerifierCookieName, verifier, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
  }

  async emailPasswordResetPassword({
    resetToken,
    password,
  }: {
    resetToken: string;
    password: string;
  }): Promise<{ tokenData: TokenData }> {
    const verifier = this.cookies.get(this.config.pkceVerifierCookieName);

    if (!verifier) {
      throw new Error("no pkce verifier cookie found");
    }

    const tokenData = await (
      await this.core
    ).resetPasswordWithResetToken(resetToken, verifier, password);

    this.cookies.set(this.config.authCookieName, tokenData.auth_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    this.cookies.delete(this.config.pkceVerifierCookieName, {
      path: "/",
    });
    return { tokenData };
  }

  async signout(): Promise<void> {
    this.cookies.delete(this.config.authCookieName, { path: "/" });
  }
}
