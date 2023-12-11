import { type BuiltinOAuthProviderNames } from "@edgedb/auth-core";
import type { Client } from "edgedb";

export interface RemixAuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetPath?: string;
}

type OptionalOptions = "passwordResetPath";

export function createClientAuth(options: RemixAuthOptions) {
  return new RemixClientAuth(options);
}

export class RemixClientAuth {
  protected readonly options: Required<
    Omit<RemixAuthOptions, OptionalOptions>
  > &
    Pick<RemixAuthOptions, OptionalOptions>;

  constructor(options: RemixAuthOptions) {
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

export class RemixAuthSession {
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
