import { redirect, json, type TypedResponse } from "@remix-run/server-runtime";
import * as cookie from "cookie";
import type { Client } from "edgedb";
import {
  Auth,
  builtinOAuthProviderNames,
  type BuiltinOAuthProviderNames,
  type TokenData,
  type emailPasswordProviderName,
} from "@edgedb/auth-core";
import { type RemixAuthOptions, RemixClientAuth } from "./client";

export type { TokenData, RemixAuthOptions };

export type BuiltinProviderNames =
  | BuiltinOAuthProviderNames
  | typeof emailPasswordProviderName;

export default function createServerAuth(
  client: Client,
  options: RemixAuthOptions
) {
  return new RemixServerAuth(client, options);
}

type ParamsOrError<Result extends object, ErrorDetails extends object = {}> =
  | ({ error: null } & { [Key in keyof ErrorDetails]?: undefined } & Result)
  | ({ error: Error } & ErrorDetails & { [Key in keyof Result]?: undefined });

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

export interface CreateAuthRouteHandlers {
  onOAuthCallback(
    params: ParamsOrError<{
      tokenData: TokenData;
      provider: BuiltinOAuthProviderNames;
      isSignUp: boolean;
    }>
  ): Promise<Response>;
  onBuiltinUICallback(
    params: ParamsOrError<
      (
        | {
            tokenData: TokenData;
            provider: BuiltinProviderNames;
          }
        | { tokenData: null; provider: null }
      ) & { isSignUp: boolean }
    >
  ): Promise<Response>;
  onEmailVerify(
    params: ParamsOrError<
      { tokenData: TokenData },
      { verificationToken?: string }
    >
  ): Promise<Response>;
  onSignout(): Promise<Response>;
}

export class RemixServerAuth extends RemixClientAuth {
  private readonly client: Client;
  private readonly core: Promise<Auth>;

  /** @internal */
  constructor(client: Client, options: RemixAuthOptions) {
    super(options);

    this.client = client;
    this.core = Auth.create(client);
  }

  isPasswordResetTokenValid(resetToken: string) {
    return Auth.checkPasswordResetTokenValid(resetToken);
  }

  getSession(req: Request) {
    return new RemixAuthSession(
      this.client,
      parseCookies(req)[this.options.authCookieName]
    );
  }

  async getProvidersInfo() {
    return (await this.core).getProvidersInfo();
  }

  createAuthRouteHandlers({
    onOAuthCallback,
    onBuiltinUICallback,
    onEmailVerify,
    onSignout,
  }: Partial<CreateAuthRouteHandlers>) {
    return {
      loader: async ({
        request: req,
        params,
      }: {
        request: Request;
        params: { [key: string]: string | undefined };
      }) => {
        const path = params["*"];
        if (!path) {
          throw new Error(`route handlers file should end with '.$.ts'`);
        }
        const searchParams = new URL(req.url).searchParams;
        switch (path) {
          case "oauth": {
            if (!onOAuthCallback) {
              throw new Error(
                `'onOAuthCallback' auth route handler not configured`
              );
            }
            const provider = searchParams.get(
              "provider_name"
            ) as BuiltinOAuthProviderNames | null;
            if (!provider || !builtinOAuthProviderNames.includes(provider)) {
              throw new Error(`invalid provider_name: ${provider}`);
            }
            const redirectUrl = `${this._authRoute}/oauth/callback`;
            const pkceSession = await this.core.then((core) =>
              core.createPKCESession()
            );
            return redirect(
              pkceSession.getOAuthUrl(
                provider,
                redirectUrl,
                `${redirectUrl}?isSignUp=true`
              ),
              {
                headers: new Headers({
                  "Set-Cookie": cookie.serialize(
                    this.options.pkceVerifierCookieName,
                    pkceSession.verifier,
                    { httpOnly: true, path: "/" }
                  ),
                }),
              }
            );
          }

          case "oauth/callback": {
            if (!onOAuthCallback) {
              throw new Error(
                `'onOAuthCallback' auth route handler not configured`
              );
            }
            const error = searchParams.get("error");
            if (error) {
              const desc = searchParams.get("error_description");
              return cbCall(onOAuthCallback, {
                error: new Error(error + (desc ? `: ${desc}` : "")),
              });
            }
            const code = searchParams.get("code");
            const isSignUp = searchParams.get("isSignUp") === "true";
            const verifier =
              parseCookies(req)[this.options.pkceVerifierCookieName];
            if (!code) {
              return cbCall(onOAuthCallback, {
                error: new Error("no pkce code in response"),
              });
            }
            if (!verifier) {
              return cbCall(onOAuthCallback, {
                error: new Error("no pkce verifier cookie found"),
              });
            }
            let tokenData: TokenData;
            try {
              tokenData = await (await this.core).getToken(code, verifier);
            } catch (err) {
              return cbCall(onOAuthCallback, {
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }
            const headers = new Headers();
            headers.append(
              "Set-Cookie",
              cookie.serialize(
                this.options.authCookieName,
                tokenData.auth_token,
                { httpOnly: true, sameSite: "lax", path: "/" }
              )
            );
            headers.append(
              "Set-Cookie",
              cookie.serialize(this.options.pkceVerifierCookieName, "", {
                maxAge: 0,
                path: "/",
              })
            );
            return cbCall(
              onOAuthCallback,
              {
                error: null,
                tokenData,
                provider: searchParams.get(
                  "provider"
                ) as BuiltinOAuthProviderNames,
                isSignUp,
              },
              headers
            );
          }

          case "builtin/callback": {
            if (!onBuiltinUICallback) {
              throw new Error(
                `'onBuiltinUICallback' auth route handler not configured`
              );
            }
            const error = searchParams.get("error");
            if (error) {
              const desc = searchParams.get("error_description");
              return cbCall(onBuiltinUICallback, {
                error: new Error(error + (desc ? `: ${desc}` : "")),
              });
            }
            const code = searchParams.get("code");
            const verificationEmailSentAt = searchParams.get(
              "verification_email_sent_at"
            );
            if (!code) {
              if (verificationEmailSentAt) {
                return cbCall(onBuiltinUICallback, {
                  error: null,
                  tokenData: null,
                  provider: null,
                  isSignUp: true,
                });
              }
              return cbCall(onBuiltinUICallback, {
                error: new Error("no pkce code in response"),
              });
            }
            const verifier =
              parseCookies(req)[this.options.pkceVerifierCookieName];

            if (!verifier) {
              return cbCall(onBuiltinUICallback, {
                error: new Error("no pkce verifier cookie found"),
              });
            }
            const isSignUp = searchParams.get("isSignUp") === "true";
            let tokenData: TokenData;
            try {
              tokenData = await (await this.core).getToken(code, verifier);
            } catch (err) {
              return cbCall(onBuiltinUICallback, {
                error: err instanceof Error ? err : new Error(String(err)),
              });
            }
            const headers = new Headers();
            headers.append(
              "Set-Cookie",
              cookie.serialize(
                this.options.authCookieName,
                tokenData.auth_token,
                {
                  httpOnly: true,
                  sameSite: "strict",
                  path: "/",
                }
              )
            );
            headers.append(
              "Set-Cookie",
              cookie.serialize(this.options.pkceVerifierCookieName, "", {
                maxAge: 0,
                path: "/",
              })
            );
            return cbCall(
              onBuiltinUICallback,
              {
                error: null,
                tokenData,
                provider: searchParams.get("provider") as BuiltinProviderNames,
                isSignUp,
              },
              headers
            );
          }

          case "builtin/signin":
          case "builtin/signup": {
            const pkceSession = await this.core.then((core) =>
              core.createPKCESession()
            );
            return redirect(
              path.split("/").pop() === "signup"
                ? pkceSession.getHostedUISignupUrl()
                : pkceSession.getHostedUISigninUrl(),
              {
                headers: {
                  "Set-Cookie": cookie.serialize(
                    this.options.pkceVerifierCookieName,
                    pkceSession.verifier,
                    { httpOnly: true, path: "/" }
                  ),
                },
              }
            );
          }

          case "emailpassword/verify": {
            if (!onEmailVerify) {
              throw new Error(
                `'onEmailVerify' auth route handler not configured`
              );
            }
            const verificationToken = searchParams.get("verification_token");
            const verifier =
              parseCookies(req)[this.options.pkceVerifierCookieName];
            if (!verificationToken) {
              return cbCall(onEmailVerify, {
                error: new Error("no verification_token in response"),
              });
            }
            if (!verifier) {
              return cbCall(onEmailVerify, {
                error: new Error("no pkce verifier cookie found"),
                verificationToken,
              });
            }
            let tokenData: TokenData;
            try {
              tokenData = await (
                await this.core
              ).verifyEmailPasswordSignup(verificationToken, verifier);
            } catch (err) {
              return cbCall(onEmailVerify, {
                error: err instanceof Error ? err : new Error(String(err)),
                verificationToken,
              });
            }
            const headers = new Headers({
              "Set-Cookie": cookie.serialize(
                this.options.authCookieName,
                tokenData.auth_token,
                {
                  httpOnly: true,
                  sameSite: "strict",
                  path: "/",
                }
              ),
            });
            return cbCall(
              onEmailVerify,
              {
                error: null,
                tokenData,
              },
              headers
            );
          }

          case "signout": {
            if (!onSignout) {
              throw new Error(`'onSignout' auth route handler not configured`);
            }
            const headers = new Headers({
              "Set-Cookie": cookie.serialize(this.options.authCookieName, "", {
                httpOnly: true,
                sameSite: "strict",
                path: "/",
                maxAge: 0,
              }),
            });
            return cbCall(onSignout, {}, headers);
          }

          default:
            throw new Error("Unknown auth route");
        }
      },
    };
  }

  async emailPasswordSignUp(
    req: Request,
    data?: { email: string; password: string }
  ): Promise<{ tokenData: TokenData; headers: Headers }>;
  async emailPasswordSignUp<Res>(
    req: Request,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordSignUp<Res>(
    req: Request,
    data: { email: string; password: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordSignUp<Res>(
    req: Request,
    dataOrCb?:
      | { email: string; password: string }
      | ((
          params: ParamsOrError<{ tokenData: TokenData }>
        ) => Res | Promise<Res>),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<
    | {
        tokenData: TokenData;
        headers: Headers;
      }
    | (Res extends Response ? Res : TypedResponse<Res>)
  > {
    return handleAction(
      async (data, headers) => {
        const [email, password] = _extractParams(
          data,
          ["email", "password"],
          "email or password missing"
        );

        const result = await (
          await this.core
        ).signupWithEmailPassword(
          email,
          password,
          `${this._authRoute}/emailpassword/verify`
        );

        headers.append(
          "Set-Cookie",
          cookie.serialize(
            this.options.pkceVerifierCookieName,
            result.verifier,
            {
              httpOnly: true,
              sameSite: "strict",
              path: "/",
            }
          )
        );

        if (result.status === "complete") {
          const tokenData = result.tokenData;

          headers.append(
            "Set-Cookie",
            cookie.serialize(
              this.options.authCookieName,
              tokenData.auth_token,
              {
                httpOnly: true,
                sameSite: "strict",
                path: "/",
              }
            )
          );
          return { tokenData, headers };
        }

        return { tokenData: null, headers };
      },
      req,
      dataOrCb,
      cb
    );
  }

  async emailPasswordResendVerificationEmail(
    req: Request,
    data?: { verification_token: string }
  ): Promise<{ headers: Headers }>;
  async emailPasswordResendVerificationEmail<Res>(
    req: Request,
    cb: () => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordResendVerificationEmail<Res>(
    req: Request,
    data: { verification_token: string },
    cb: () => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordResendVerificationEmail<Res>(
    req: Request,
    dataOrCb?: { verification_token: string } | (() => Res | Promise<Res>),
    cb?: () => Res | Promise<Res>
  ): Promise<
    | {
        headers: Headers;
      }
    | (Res extends Response ? Res : TypedResponse<Res>)
  > {
    return handleAction(
      async (data) => {
        const [verificationToken] = _extractParams(
          data,
          ["verification_token"],
          "verification_token missing"
        );

        await (await this.core).resendVerificationEmail(verificationToken);
      },
      req,
      dataOrCb,
      cb
    );
  }

  async emailPasswordSignIn(
    req: Request,
    data?: { email: string; password: string }
  ): Promise<{ tokenData: TokenData; headers: Headers }>;
  async emailPasswordSignIn<Res>(
    req: Request,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordSignIn<Res>(
    req: Request,
    data: { email: string; password: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordSignIn<Res>(
    req: Request,
    dataOrCb?:
      | { email: string; password: string }
      | ((
          params: ParamsOrError<{ tokenData: TokenData }>
        ) => Res | Promise<Res>),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<
    | {
        tokenData: TokenData;
        headers: Headers;
      }
    | (Res extends Response ? Res : TypedResponse<Res>)
  > {
    return handleAction(
      async (data, headers) => {
        const [email, password] = _extractParams(
          data,
          ["email", "password"],
          "email or password missing"
        );

        const tokenData = await (
          await this.core
        ).signinWithEmailPassword(email, password);

        headers.append(
          "Set-Cookie",
          cookie.serialize(this.options.authCookieName, tokenData.auth_token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/",
          })
        );

        return { tokenData };
      },
      req,
      dataOrCb,
      cb
    );
  }

  async emailPasswordSendPasswordResetEmail(
    req: Request,
    data?: { email: string }
  ): Promise<{ tokenData: TokenData; headers: Headers }>;
  async emailPasswordSendPasswordResetEmail<Res>(
    req: Request,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordSendPasswordResetEmail<Res extends Response>(
    req: Request,
    data: { email: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordSendPasswordResetEmail<Res>(
    req: Request,
    dataOrCb?:
      | { email: string }
      | ((
          params: ParamsOrError<{ tokenData: TokenData }>
        ) => Res | Promise<Res>),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<
    | {
        tokenData: TokenData;
        headers: Headers;
      }
    | (Res extends Response ? Res : TypedResponse<Res>)
  > {
    return handleAction(
      async (data, headers) => {
        if (!this.options.passwordResetPath) {
          throw new Error(`'passwordResetPath' option not configured`);
        }
        const [email] = _extractParams(data, ["email"], "email missing");

        const { verifier } = await (
          await this.core
        ).sendPasswordResetEmail(
          email,
          new URL(
            this.options.passwordResetPath,
            this.options.baseUrl
          ).toString()
        );

        headers.append(
          "Set-Cookie",
          cookie.serialize(this.options.pkceVerifierCookieName, verifier, {
            httpOnly: true,
            sameSite: "strict",
            path: "/",
          })
        );
      },
      req,
      dataOrCb,
      cb
    );
  }

  async emailPasswordResetPassword(
    req: Request,
    data?: { reset_token: string; password: string }
  ): Promise<{ tokenData: TokenData; headers: Headers }>;
  async emailPasswordResetPassword<Res>(
    req: Request,
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordResetPassword<Res extends Response>(
    req: Request,
    data: { reset_token: string; password: string },
    cb: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async emailPasswordResetPassword<Res>(
    req: Request,
    dataOrCb?:
      | { reset_token: string; password: string }
      | ((
          params: ParamsOrError<{ tokenData: TokenData }>
        ) => Res | Promise<Res>),
    cb?: (params: ParamsOrError<{ tokenData: TokenData }>) => Res | Promise<Res>
  ): Promise<
    | {
        tokenData: TokenData;
        headers: Headers;
      }
    | (Res extends Response ? Res : TypedResponse<Res>)
  > {
    return handleAction(
      async (data, headers, req) => {
        const verifier = parseCookies(req)[this.options.pkceVerifierCookieName];

        if (!verifier) {
          throw new Error("no pkce verifier cookie found");
        }

        const [resetToken, password] = _extractParams(
          data,
          ["reset_token", "password"],
          "reset_token or password missing"
        );

        const tokenData = await (
          await this.core
        ).resetPasswordWithResetToken(resetToken, verifier, password);

        headers.append(
          "Set-Cookie",
          cookie.serialize(this.options.authCookieName, tokenData.auth_token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
          })
        );

        headers.append(
          "Set-Cookie",
          cookie.serialize(this.options.pkceVerifierCookieName, "", {
            maxAge: 0,
            path: "/",
          })
        );

        return { tokenData };
      },
      req,
      dataOrCb,
      cb
    );
  }

  async signout(): Promise<{ headers: Headers }>;
  async signout<Res>(
    cb: () => Res | Promise<Res>
  ): Promise<Res extends Response ? Res : TypedResponse<Res>>;
  async signout<Res>(cb?: () => Res | Promise<Res>): Promise<
    | {
        headers: Headers;
      }
    | (Res extends Response ? Res : TypedResponse<Res>)
  > {
    const headers = new Headers({
      "Set-Cookie": cookie.serialize(this.options.authCookieName, "", {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      }),
    });

    if (cb) return actionCbCall(cb, headers);

    return { headers };
  }
}

function parseCookies(req: Request) {
  const cookies = req.headers.get("Cookie");
  return cookie.parse(cookies || "");
}

function _extractParams(
  data: FormData | Record<string, unknown>,
  paramNames: string[],
  errMessage: string
) {
  const params: string[] = [];
  if (data instanceof FormData) {
    for (const paramName of paramNames) {
      const param = data.get(paramName)?.toString();
      if (!param) {
        throw new Error(errMessage);
      }
      params.push(param);
    }
  } else {
    if (typeof data !== "object") {
      throw new Error("expected json object");
    }
    for (const paramName of paramNames) {
      const param = data[paramName];
      if (!param) {
        throw new Error(errMessage);
      }
      if (typeof param !== "string") {
        throw new Error(`expected '${paramName}' to be a string`);
      }
      params.push(param);
    }
  }

  return params;
}

async function handleAction(
  action: (
    data: Record<string, string> | FormData,
    headers: Headers,
    req: Request
  ) => Promise<any>,
  req: Request,
  dataOrCb: Record<string, string> | ((data: any) => any) | undefined,
  cb: ((data: any) => any) | undefined
) {
  const data = typeof dataOrCb === "object" ? dataOrCb : await req.formData();
  const callback = typeof dataOrCb === "function" ? dataOrCb : cb;

  const headers: Headers = new Headers();
  let params: any;
  let error: Error | null = null;

  try {
    params = (await action(data, headers, req)) || {};
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (callback) {
    return actionCbCall(callback, headers, error, params);
  } else {
    if (error) {
      throw error;
    }

    return { ...params, headers };
  }
}

async function actionCbCall(
  cb: (data?: any) => any,
  headers: Headers,
  error?: Error | null,
  params?: any
) {
  let res: any;

  try {
    res = error || params ? await cb(error ? { error } : params) : await cb();
  } catch (err) {
    if (err instanceof Response) {
      res = err;
    } else {
      throw err;
    }
  }

  if (res instanceof Response) {
    const newHeaders = new Headers(res.headers);
    for (const [key, val] of headers.entries()) {
      newHeaders.append(key, val);
    }

    return new Response(res.body, {
      headers: newHeaders,
      status: res.status,
    });
  } else {
    return json(res, { headers });
  }
}

async function cbCall(cb: (data?: any) => any, params: any, headers?: Headers) {
  let res: any;

  try {
    res = params ? await cb(params) : await cb();
  } catch (err) {
    if (err instanceof Response) {
      res = err;
    } else {
      throw err;
    }
  }

  if (
    res instanceof Response &&
    res.status > 300 &&
    res.status < 400 &&
    res.headers.get("Location")
  ) {
    const newHeaders = new Headers(res.headers);

    if (headers) {
      for (const [key, val] of headers.entries()) {
        newHeaders.append(key, val);
      }
    }

    return new Response(res.body, {
      headers: newHeaders,
      status: res.status,
    });
  } else {
    throw Error("The auth route callback should return redirect.");
  }
}
