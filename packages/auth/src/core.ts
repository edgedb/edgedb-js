import jwtDecode from "jwt-decode";
import * as edgedb from "edgedb";
import { ResolvedConnectConfig } from "edgedb/dist/conUtils";

import * as pkce from "./pkce";

export interface TokenData {
  auth_token: string;
  identity_id: string | null;
  provider_token: string | null;
  provider_refresh_token: string | null;
}

export const builtinOAuthProviderNames = [
  "builtin::oauth_apple",
  "builtin::oauth_azure",
  "builtin::oauth_github",
  "builtin::oauth_google",
] as const;
export type BuiltinOAuthProviderNames =
  (typeof builtinOAuthProviderNames)[number];

export const builtinLocalProviderNames = [
  "builtin::local_emailpassword",
] as const;
export type BuiltinLocalProviderNames =
  (typeof builtinLocalProviderNames)[number];

export class Auth {
  /** @internal */
  public readonly baseUrl: string;

  protected constructor(
    public readonly client: edgedb.Client,
    baseUrl: string
  ) {
    this.baseUrl = baseUrl;
  }

  static async create(client: edgedb.Client) {
    const connectConfig: ResolvedConnectConfig = (
      await (client as any).pool._getNormalizedConnectConfig()
    ).connectionParams;

    const [host, port] = connectConfig.address;
    const baseUrl = `${
      connectConfig.tlsSecurity === "insecure" ? "http" : "https"
    }://${host}:${port}/db/${connectConfig.database}/ext/auth`;

    return new this(client, baseUrl);
  }

  /** @internal */
  public async _fetch(
    path: string,
    method: "get",
    searchParams?: Record<string, string>
  ): Promise<unknown>;
  public async _fetch(
    path: string,
    method: "post",
    searchParams?: Record<string, string>,
    body?: any
  ): Promise<unknown>;
  public async _fetch(
    path: string,
    method: "get" | "post",
    searchParams?: Record<string, string>,
    body?: any
  ) {
    const url = `${this.baseUrl}/${path}${
      searchParams ? "?" + new URLSearchParams(searchParams).toString() : ""
    }`;
    const res = await fetch(url, {
      method,
      // verbose: true,
      ...(body != null
        ? {
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          }
        : undefined),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    if (res.headers.get("content-type")?.startsWith("application/json")) {
      return res.json();
    }
    return null;
  }

  createPKCESession() {
    return new AuthPCKESession(this);
  }

  getToken(code: string, verifier: string): Promise<TokenData> {
    return this._fetch("token", "get", {
      code,
      verifier,
    }) as Promise<TokenData>;
  }

  async signinWithEmailPassword(email: string, password: string) {
    const { challenge, verifier } = pkce.createVerifierChallengePair();
    const { code } = (await this._fetch("authenticate", "post", undefined, {
      provider: "builtin::local_emailpassword",
      challenge,
      email,
      password,
    })) as { code: string };
    return this.getToken(code, verifier);
  }

  async signupWithEmailPassword(
    email: string,
    password: string,
    verifyUrl: string
  ): Promise<
    | { status: "complete"; tokenData: TokenData }
    | { status: "verificationRequired"; verifier: string }
  > {
    const { challenge, verifier } = pkce.createVerifierChallengePair();
    const result = (await this._fetch("register", "post", undefined, {
      provider: "builtin::local_emailpassword",
      challenge,
      email,
      password,
      verify_url: verifyUrl,
    })) as { code: string } | { verification_email_sent_at: string };
    if ("code" in result) {
      return {
        status: "complete",
        tokenData: await this.getToken(result.code, verifier),
      };
    } else {
      return { status: "verificationRequired", verifier };
    }
  }

  async verifyEmailPasswordSignup(verificationToken: string, verifier: string) {
    const { code } = (await this._fetch("verify", "post", undefined, {
      provider: "builtin::local_emailpassword",
      verification_token: verificationToken,
    })) as { code: string };
    return this.getToken(code, verifier);
  }

  async resendVerificationEmail(verificationToken: string) {
    await this._fetch("resend-verification-email", "post", undefined, {
      provider: "builtin::local_emailpassword",
      verification_token: verificationToken,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    return this._fetch("send-reset-email", "post", undefined, {
      provider: "builtin::local_emailpassword",
      email,
      reset_url: resetUrl,
    }) as Promise<{ email_sent: string }>;
  }

  static checkPasswordResetTokenValid(resetToken: string) {
    try {
      const payload = jwtDecode(resetToken);
      if (
        typeof payload != "object" ||
        payload == null ||
        !("exp" in payload) ||
        typeof payload.exp != "number"
      ) {
        return false;
      }
      return payload.exp < Date.now();
    } catch {
      return false;
    }
  }

  async resetPasswordWithResetToken(resetToken: string, password: string) {
    return this._fetch("reset-password", "post", undefined, {
      provider: "builtin::local_emailpassword",
      reset_token: resetToken,
      password,
    }) as Promise<TokenData>;
  }

  async getProvidersInfo() {
    // TODO: cache this data somehow?
    const providers = (await this.client.query(`
    with module ext::auth
    select cfg::Config.extensions[is AuthConfig].providers {
      _typename := .__type__.name,
      name,
      [is OAuthProviderConfig].display_name,
    }`)) as { _typename: string; name: string; display_name: string | null }[];
    const emailPasswordProvider = providers.find(
      (p) => p.name === "builtin::local_emailpassword"
    );

    return {
      oauth: providers
        .filter((p) => p.name.startsWith("builtin::oauth_"))
        .map((p) => ({
          name: p.name,
          display_name: p.display_name!,
        })),
      emailPassword: emailPasswordProvider != null,
    };
  }
}

export class AuthPCKESession {
  public readonly challenge: string;
  public readonly verifier: string;

  constructor(private auth: Auth) {
    const { challenge, verifier } = pkce.createVerifierChallengePair();
    this.challenge = challenge;
    this.verifier = verifier;
  }

  getOAuthUrl(
    providerName: BuiltinOAuthProviderNames,
    redirectTo: string,
    redirectToOnSignup?: string
  ) {
    const params = new URLSearchParams({
      provider: providerName,
      challenge: this.challenge,
      redirect_to: redirectTo,
    });

    if (redirectToOnSignup) {
      params.append("redirect_to_on_signup", redirectToOnSignup);
    }

    return `${this.auth.baseUrl}/authorize?${params.toString()}`;
  }

  // getEmailPasswordSigninFormActionUrl(
  //   redirectTo: string,
  //   redirectToOnFailure?: string
  // ) {
  //   const params = new URLSearchParams({
  //     provider_name: "builtin::local_emailpassword",
  //     challenge: this.challenge,
  //     redirect_to: redirectTo,
  //   });

  //   if (redirectToOnFailure) {
  //     params.append("redirect_on_failure", redirectToOnFailure);
  //   }

  //   return `${this.auth.baseUrl}/authenticate?${params.toString()}`;
  // }

  // getEmailPasswordSignupFormActionUrl(
  //   redirectTo: string,
  //   redirectToOnFailure?: string
  // ) {
  //   const params = new URLSearchParams({
  //     provider_name: "builtin::local_emailpassword",
  //     challenge: this.challenge,
  //     redirect_to: redirectTo,
  //   });

  //   if (redirectToOnFailure) {
  //     params.append("redirect_on_failure", redirectToOnFailure);
  //   }

  //   return `${this.auth.baseUrl}/register?${params.toString()}`;
  // }

  getHostedUISigninUrl() {
    const params = new URLSearchParams({
      challenge: this.challenge,
    });

    return `${this.auth.baseUrl}/ui/signin?${params.toString()}`;
  }

  getHostedUISignupUrl() {
    const params = new URLSearchParams({
      challenge: this.challenge,
    });

    return `${this.auth.baseUrl}/ui/signup?${params.toString()}`;
  }
}
