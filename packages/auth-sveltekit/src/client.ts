import type { BuiltinOAuthProviderNames } from "@edgedb/auth-core";

export interface AuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetPath?: string;
  magicLinkFailurePath?: string;
}

type OptionalOptions = "passwordResetPath" | "magicLinkFailurePath";

export type AuthConfig = Required<Omit<AuthOptions, OptionalOptions>> &
  Pick<AuthOptions, OptionalOptions> & { authRoute: string };

export function getConfig(options: AuthOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const authRoutesPath =
    options.authRoutesPath?.replace(/^\/|\/$/g, "") ?? "auth";

  return {
    authCookieName: "edgedb-session",
    pkceVerifierCookieName: "edgedb-pkce-verifier",
    ...options,
    baseUrl,
    authRoutesPath,
    authRoute: `${baseUrl}/${authRoutesPath}`,
  };
}

export default function createClientAuth(options: AuthOptions) {
  return new ClientAuth(options);
}

export class ClientAuth {
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
