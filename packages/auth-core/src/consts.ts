// AUTOGENERATED - Run `yarn gen-consts` to re-generate.

export const builtinOAuthProviderNames = [
  "builtin::oauth_apple",
  "builtin::oauth_azure",
  "builtin::oauth_discord",
  "builtin::oauth_github",
  "builtin::oauth_google",
  "builtin::oauth_slack",
] as const;
export type BuiltinOAuthProviderNames =
  (typeof builtinOAuthProviderNames)[number];

export const emailPasswordProviderName = "builtin::local_emailpassword";
export const webAuthnProviderName = "builtin::local_webauthn";
export const magicLinkProviderName = "builtin::local_magic_link";
