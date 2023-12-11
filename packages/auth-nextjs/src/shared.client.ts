import {
  type BuiltinOAuthProviderNames,
  type emailPasswordProviderName,
} from "@edgedb/auth-core";

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

export interface NextAuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetPath?: string;
}

type OptionalOptions = "passwordResetPath";

export abstract class NextAuthHelpers {
  /** @internal */
  readonly options: Required<Omit<NextAuthOptions, OptionalOptions>> &
    Pick<NextAuthOptions, OptionalOptions>;

  /** @internal */
  constructor(options: NextAuthOptions) {
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
