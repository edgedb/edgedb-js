import type { Client } from "edgedb";
import { Auth, type BuiltinOAuthProviderNames } from "@edgedb/auth-core";

export interface RemixAuthOptions {
  baseUrl: string;
  authRoutesPath?: string;
  authCookieName?: string;
  pkceVerifierCookieName?: string;
  passwordResetPath?: string;
}

type OptionalOptions = "passwordResetPath";

export default function createRemixAppAuth(
  client: Client,
  options: RemixAuthOptions
) {
  return new RemixAppAuth(client, options);
}

export class RemixAppAuth {
  private readonly core: Promise<Auth>;

  private readonly options: Required<Omit<RemixAuthOptions, OptionalOptions>> &
    Pick<RemixAuthOptions, OptionalOptions>;

  constructor(client: Client, options: RemixAuthOptions) {
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      authRoutesPath: options.authRoutesPath?.replace(/^\/|\/$/g, "") ?? "auth",
      authCookieName: options.authCookieName ?? "edgedb-session",
      pkceVerifierCookieName:
        options.pkceVerifierCookieName ?? "edgedb-pkce-verifier",
      passwordResetPath: options.passwordResetPath,
    };

    this.core = Auth.create(client);
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

  // getSession() {
  //   return new NextAuthSession(
  //     this.client,
  //     cookies().get(this.options.authCookieName)?.value.split(";")[0]
  //   );
  // }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }
}
