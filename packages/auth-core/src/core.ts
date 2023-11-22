import jwtDecode from "jwt-decode";
import * as edgedb from "edgedb";
import { type ResolvedConnectConfig } from "edgedb/dist/conUtils";

import * as pkce from "./pkce";
import {
  type BuiltinOAuthProviderNames,
  emailPasswordProviderName,
} from "./consts";

export interface TokenData {
  auth_token: string;
  identity_id: string | null;
  provider_token: string | null;
  provider_refresh_token: string | null;
}

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
    }://${host}:${port}/db/${connectConfig.database}/ext/auth/`;

    return new this(client, baseUrl);
  }

  /** @internal */
  public async _get<T extends any = unknown>(path: string): Promise<T> {
    const res = await fetch(new URL(path, this.baseUrl), {
      method: "get",
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    if (res.headers.get("content-type")?.startsWith("application/json")) {
      return res.json();
    }
    return null as any;
  }

  /** @internal */
  public async _post<T extends any = unknown>(
    path: string,
    body?: any
  ): Promise<T> {
    const res = await fetch(new URL(path, this.baseUrl), {
      method: "post",
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
    return null as any;
  }

  async createPKCESession() {
    const { challenge, verifier } = await pkce.createVerifierChallengePair();
    return new AuthPCKESession(this, challenge, verifier);
  }

  getToken(code: string, verifier: string): Promise<TokenData> {
    return this._get<TokenData>(
      `token?${new URLSearchParams({
        code,
        verifier,
      }).toString()}`
    );
  }

  async signinWithEmailPassword(email: string, password: string) {
    const { challenge, verifier } = await pkce.createVerifierChallengePair();
    const { code } = await this._post<{ code: string }>("authenticate", {
      provider: emailPasswordProviderName,
      challenge,
      email,
      password,
    });
    return this.getToken(code, verifier);
  }

  async signupWithEmailPassword(
    email: string,
    password: string,
    verifyUrl: string
  ): Promise<
    | { status: "complete"; verifier: string; tokenData: TokenData }
    | { status: "verificationRequired"; verifier: string }
  > {
    const { challenge, verifier } = await pkce.createVerifierChallengePair();
    const result = await this._post<
      { code: string } | { verification_email_sent_at: string }
    >("register", {
      provider: emailPasswordProviderName,
      challenge,
      email,
      password,
      verify_url: verifyUrl,
    });
    if ("code" in result) {
      return {
        status: "complete",
        verifier,
        tokenData: await this.getToken(result.code, verifier),
      };
    } else {
      return { status: "verificationRequired", verifier };
    }
  }

  async verifyEmailPasswordSignup(verificationToken: string, verifier: string) {
    const { code } = await this._post<{ code: string }>("verify", {
      provider: emailPasswordProviderName,
      verification_token: verificationToken,
    });
    return this.getToken(code, verifier);
  }

  async resendVerificationEmail(verificationToken: string) {
    await this._post("resend-verification-email", {
      provider: emailPasswordProviderName,
      verification_token: verificationToken,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    const { challenge, verifier } = await pkce.createVerifierChallengePair();
    return {
      verifier,
      ...(await this._post<{ email_sent: string }>("send-reset-email", {
        provider: emailPasswordProviderName,
        challenge,
        email,
        reset_url: resetUrl,
      })),
    };
  }

  static checkPasswordResetTokenValid(resetToken: string) {
    try {
      const payload = jwtDecode(resetToken);
      if (
        typeof payload !== "object" ||
        payload == null ||
        !("exp" in payload) ||
        typeof payload.exp !== "number"
      ) {
        return false;
      }
      return payload.exp < Date.now();
    } catch {
      return false;
    }
  }

  async resetPasswordWithResetToken(
    resetToken: string,
    verifier: string,
    password: string
  ) {
    const { code } = await this._post<{ code: string }>("reset-password", {
      provider: emailPasswordProviderName,
      reset_token: resetToken,
      password,
    });
    return this.getToken(code, verifier);
  }

  async getProvidersInfo() {
    // TODO: cache this data when we have a way to invalidate on config update
    try {
      return await this.client.queryRequiredSingle<{
        oauth: { name: BuiltinOAuthProviderNames; display_name: string }[];
        emailPassword: boolean;
      }>(`
      with
        module ext::auth,
        providers := (select cfg::Config.extensions[is AuthConfig].providers)
      select {
        oauth := providers[is OAuthProviderConfig] {
          name,
          display_name
        },
        emailPassword := exists providers[is EmailPasswordProviderConfig]
      }`);
    } catch (err) {
      if (err instanceof edgedb.InvalidReferenceError) {
        throw new Error("auth extension is not enabled");
      }
      throw err;
    }
  }
}

export class AuthPCKESession {
  constructor(
    private auth: Auth,
    public readonly challenge: string,
    public readonly verifier: string
  ) {}

  getOAuthUrl(
    providerName: BuiltinOAuthProviderNames,
    redirectTo: string,
    redirectToOnSignup?: string
  ) {
    const url = new URL("authorize", this.auth.baseUrl);

    url.searchParams.set("provider", providerName);
    url.searchParams.set("challenge", this.challenge);
    url.searchParams.set("redirect_to", redirectTo);

    if (redirectToOnSignup) {
      url.searchParams.set("redirect_to_on_signup", redirectToOnSignup);
    }

    return url.toString();
  }

  // getEmailPasswordSigninFormActionUrl(
  //   redirectTo: string,
  //   redirectToOnFailure?: string
  // ) {
  //   const params = new URLSearchParams({
  //     provider_name: emailPasswordProviderName,
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
  //     provider_name: emailPasswordProviderName,
  //     challenge: this.challenge,
  //     redirect_to: redirectTo,
  //   });

  //   if (redirectToOnFailure) {
  //     params.append("redirect_on_failure", redirectToOnFailure);
  //   }

  //   return `${this.auth.baseUrl}/register?${params.toString()}`;
  // }

  getHostedUISigninUrl() {
    const url = new URL("ui/signin", this.auth.baseUrl);
    url.searchParams.set("challenge", this.challenge);

    return url.toString();
  }

  getHostedUISignupUrl() {
    const url = new URL("ui/signup", this.auth.baseUrl);
    url.searchParams.set("challenge", this.challenge);

    return url.toString();
  }
}
