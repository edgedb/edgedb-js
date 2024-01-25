import type { BuiltinOAuthProviderNames } from "@edgedb/auth-core";

export interface SvelteAuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetPath?: string;
}

type OptionalOptions = "passwordResetPath";

export type SvelteAuthConfig = Required<
  Omit<SvelteAuthOptions, OptionalOptions>
> &
  Pick<SvelteAuthOptions, OptionalOptions> & { authRoute: string };

export function getConfig(options: SvelteAuthOptions) {
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

export default function createClientAuth(options: SvelteAuthOptions) {
  return new SvelteClientAuth(options);
}

export class SvelteClientAuth {
  protected readonly config: SvelteAuthConfig;

  /** @internal */
  constructor(options: SvelteAuthOptions) {
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
