import { Client } from "edgedb";
import { Auth, BuiltinOAuthProviderNames } from "@edgedb/auth-core";

export interface NextAuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetUrl?: string;
}

type OptionalOptions = "passwordResetUrl";

export abstract class NextAuth {
  /** @internal */
  readonly options: Required<Omit<NextAuthOptions, OptionalOptions>> &
    Pick<NextAuthOptions, OptionalOptions>;

  /** @internal */
  constructor(protected readonly client: Client, options: NextAuthOptions) {
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      authRoutesPath: options.authRoutesPath?.replace(/^\/|\/$/g, "") ?? "auth",
      authCookieName: options.authCookieName ?? "edgedb-session",
      pkceVerifierCookieName:
        options.pkceVerifierCookieName ?? "edgedb-pkce-verifier",
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

export class NextAuthSession {
  public readonly client: Client;

  /** @internal */
  constructor(client: Client, private readonly authToken: string | undefined) {
    this.client = this.authToken
      ? client.withGlobals({ "ext::auth::client_token": this.authToken })
      : client;
  }

  async isLoggedIn() {
    if (!this.authToken) return false;
    return (await this.client.querySingle(
      `select exists global ext::auth::ClientTokenIdentity`
    )) as boolean;
  }
}
