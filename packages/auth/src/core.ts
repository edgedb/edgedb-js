import jwtDecode from "jwt-decode";
import * as edgedb from "edgedb";
import { ResolvedConnectConfig } from "edgedb/dist/conUtils";

import * as pkce from "./pkce";

interface TokenData {
  auth_token: string;
  identity_id: string | null;
  provider_token: string | null;
  provider_refresh_token: string | null;
}

const builtinOAuthProviderNames = [
  "builtin::oauth_apple",
  "builtin::oauth_azure",
  "builtin::oauth_github",
  "builtin::oauth_google",
] as const;
type BuiltinOAuthProviderNames = (typeof builtinOAuthProviderNames)[number];

const builtinLocalProviderNames = ["builtin::local_emailpassword"] as const;
type BuiltinLocalProviderNames = (typeof builtinLocalProviderNames)[number];

export class Auth {
  /** @internal */
  public readonly baseUrl: string;

  private constructor(private readonly client: edgedb.Client, baseUrl: string) {
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

  createAuthSession() {
    return new AuthSession(this);
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

  async signupWithEmailPassword(email: string, password: string) {
    const { challenge, verifier } = pkce.createVerifierChallengePair();
    const { code } = (await this._fetch("register", "post", undefined, {
      provider: "builtin::local_emailpassword",
      challenge,
      email,
      password,
    })) as { code: string };
    return this.getToken(code, verifier);
  }

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    return this._fetch("send_reset_email", "post", undefined, {
      provider: "builtin::local_emailpassword",
      email,
      reset_url: resetUrl,
    }) as Promise<{ email_sent: string }>;
  }

  checkPasswordResetTokenValid(resetToken: string) {
    const payload = jwtDecode(resetToken);
    if (
      typeof payload != "object" ||
      payload == null ||
      !("exp" in payload) ||
      typeof payload.exp != "number"
    ) {
      throw new Error("reset token does not contain valid expiry time");
    }
    return payload.exp < Date.now();
  }

  async resetPasswordWithResetToken(resetToken: string) {
    return this._fetch("reset_password", "post", undefined, {
      provider: "builtin::local_emailpassword",
      reset_token: resetToken,
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

class AuthSession {
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
      provider_name: providerName,
      challenge: this.challenge,
      redirect_to: redirectTo,
    });

    if (redirectToOnSignup) {
      params.append("redirect_to_on_signup", redirectToOnSignup);
    }

    return `${this.auth.baseUrl}/authorize?${params.toString()}`;
  }

  getEmailPasswordSigninFormActionUrl(
    redirectTo: string,
    redirectToOnFailure?: string
  ) {
    const params = new URLSearchParams({
      provider_name: "builtin::local_emailpassword",
      challenge: this.challenge,
      redirect_to: redirectTo,
    });

    if (redirectToOnFailure) {
      params.append("redirect_on_failure", redirectToOnFailure);
    }

    return `${this.auth.baseUrl}/authenticate?${params.toString()}`;
  }

  getEmailPasswordSignupFormActionUrl(
    redirectTo: string,
    redirectToOnFailure?: string
  ) {
    const params = new URLSearchParams({
      provider_name: "builtin::local_emailpassword",
      challenge: this.challenge,
      redirect_to: redirectTo,
    });

    if (redirectToOnFailure) {
      params.append("redirect_on_failure", redirectToOnFailure);
    }

    return `${this.auth.baseUrl}/register?${params.toString()}`;
  }

  getHostedUISigninUrl() {
    const params = new URLSearchParams({
      challenge: this.challenge,
    });

    return `${this.auth.baseUrl}/ui/sigin?${params.toString()}`;
  }

  getHostedUISignupUrl() {
    const params = new URLSearchParams({
      challenge: this.challenge,
    });

    return `${this.auth.baseUrl}/ui/signup?${params.toString()}`;
  }
}
