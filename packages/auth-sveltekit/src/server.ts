import { redirect, type Cookies, type RequestEvent } from "@sveltejs/kit";
import type { Client } from "edgedb";
import {
  Auth,
  builtinOAuthProviderNames,
  type BuiltinOAuthProviderNames,
  type TokenData,
  type emailPasswordProviderName,
} from "@edgedb/auth-core";
import { type SvelteAuthOptions, SvelteClientAuth } from "./client.js";

export type { TokenData, SvelteAuthOptions, Client };

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

export default function createServerAuth(
  client: Client,
  options: SvelteAuthOptions,
  event: RequestEvent
) {
  return new SvelteServerAuth(client, options, event);
}

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
  private readonly cookies: Cookies;

  /** @internal */
  constructor(
    client: Client,
    options: SvelteAuthOptions,
    { cookies }: RequestEvent
  ) {
    super(options);

    this.client = client;
    this.core = Auth.create(client);
    this.cookies = cookies;
  }

  isPasswordResetTokenValid(resetToken: string) {
    return Auth.checkPasswordResetTokenValid(resetToken);
  }

  getSession() {
    return new SvelteAuthSession(
      this.client,
      this.cookies.get(this.options.authCookieName)
    );
  }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  async createAuthRouteHandlers(
    {
      onOAuthCallback,
      onBuiltinUICallback,
      onEmailVerify,
      onSignout,
    }: Partial<CreateAuthRouteHandlers>,
    request: Request
  ) {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const path = url.pathname.split("/").slice(2).join("/");

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

        this.cookies.set(
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
        const verifier = this.cookies.get(this.options.pkceVerifierCookieName);
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

        this.cookies.set(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });

        this.cookies.set(this.options.pkceVerifierCookieName, "", {
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
        const verifier = this.cookies.get(this.options.pkceVerifierCookieName);

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

        this.cookies.set(this.options.authCookieName, tokenData.auth_token, {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
        });

        this.cookies.set(this.options.pkceVerifierCookieName, "", {
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

        this.cookies.set(
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
          throw new Error(`'onEmailVerify' auth route handler not configured`);
        }
        const verificationToken = searchParams.get("verification_token");
        const verifier = this.cookies.get(this.options.pkceVerifierCookieName);
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

        this.cookies.set(this.options.authCookieName, tokenData.auth_token, {
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
        this.cookies.delete(this.options.authCookieName, { path: "/" });
        return onSignout();
      }

      default:
        throw new Error("Unknown auth route");
    }
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
      `${this._authRoute}/emailpassword/verify`
    );

    this.cookies.set(this.options.pkceVerifierCookieName, result.verifier, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });

    if (result.status === "complete") {
      const tokenData = result.tokenData;

      this.cookies.set(this.options.authCookieName, tokenData.auth_token, {
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

    this.cookies.set(this.options.authCookieName, tokenData.auth_token, {
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
    if (!this.options.passwordResetPath) {
      throw new Error(`'passwordResetPath' option not configured`);
    }

    const { verifier } = await (
      await this.core
    ).sendPasswordResetEmail(
      email,
      new URL(this.options.passwordResetPath, this.options.baseUrl).toString()
    );

    this.cookies.set(this.options.pkceVerifierCookieName, verifier, {
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
    const verifier = this.cookies.get(this.options.pkceVerifierCookieName);

    if (!verifier) {
      throw new Error("no pkce verifier cookie found");
    }

    const tokenData = await (
      await this.core
    ).resetPasswordWithResetToken(resetToken, verifier, password);

    this.cookies.set(this.options.authCookieName, tokenData.auth_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    this.cookies.delete(this.options.pkceVerifierCookieName, {
      path: "/",
    });
    return { tokenData };
  }

  async signout(): Promise<void> {
    this.cookies.delete(this.options.authCookieName, { path: "/" });
  }
}
