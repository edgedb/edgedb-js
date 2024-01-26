import type { BuiltinOAuthProviderNames } from "@edgedb/auth-core";

export interface AuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetPath?: string;
}

type OptionalOptions = "passwordResetPath";

export type AuthConfig = Required<Omit<AuthOptions, OptionalOptions>> &
  Pick<AuthOptions, OptionalOptions> & { authRoute: string };

export function getConfig(options: AuthOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const authRoutesPath =
    options.authRoutesPath?.replace(/^\/|\/$/g, "") ?? "auth";

  return {
    baseUrl,
    authRoutesPath,
    authCookieName: options.authCookieName ?? "edgedb-session",
    pkceVerifierCookieName:
      options.pkceVerifierCookieName ?? "edgedb-pkce-verifier",
    passwordResetPath: options.passwordResetPath,
    authRoute: `${baseUrl}/${authRoutesPath}`,
  };
}

export default function createEdgedbClientAuth(options: AuthOptions) {
  return new EdgedbClientAuth(options);
}

export class EdgedbClientAuth {
  protected readonly config: AuthConfig;

  /** @internal */
  constructor(options: AuthOptions) {
    this.config = getConfig(options);
  }

  getOAuthUrl(providerName: BuiltinOAuthProviderNames) {
    return `${this.config.authRoute}/oauth?${new URLSearchParams({
      provider_name: providerName,
    }).toString()}`;
  }

  getBuiltinUIUrl() {
    return `${this.config.authRoute}/builtin/signin`;
  }

  getBuiltinUISignUpUrl() {
    return `${this.config.authRoute}/builtin/signup`;
  }

  getSignoutUrl() {
    return `${this.config.authRoute}/signout`;
  }
}
