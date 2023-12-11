import { type NextRouter } from "next/router";
import {
  type BuiltinProviderNames,
  NextAuthHelpers,
  type NextAuthOptions,
} from "../shared.client";

export { type NextAuthOptions, type BuiltinProviderNames };

export default function createNextPagesClientAuth(options: NextAuthOptions) {
  return new NextPagesClientAuth(options);
}

export class NextPagesClientAuth extends NextAuthHelpers {
  async emailPasswordSignIn(
    router: NextRouter,
    data: { email: string; password: string } | FormData
  ) {
    return await apiRequest(
      router,
      `${this._authRoute}/emailpassword/signin`,
      data
    );
  }

  async emailPasswordSignUp(
    router: NextRouter,
    data: { email: string; password: string } | FormData
  ) {
    return await apiRequest(
      router,
      `${this._authRoute}/emailpassword/signup`,
      data
    );
  }

  async emailPasswordSendPasswordResetEmail(
    router: NextRouter,
    data: { email: string } | FormData
  ) {
    return await apiRequest(
      router,
      `${this._authRoute}/emailpassword/send-reset-email`,
      data
    );
  }

  async emailPasswordResetPassword(
    router: NextRouter,
    data:
      | {
          reset_token: string;
          password: string;
        }
      | FormData
  ) {
    return await apiRequest(
      router,
      `${this._authRoute}/emailpassword/reset-password`,
      data
    );
  }

  async emailPasswordResendVerificationEmail(
    router: NextRouter,
    data:
      | {
          verification_token: string;
        }
      | FormData
  ) {
    return await apiRequest(
      router,
      `${this._authRoute}/emailpassword/resend-verification-email`,
      data
    );
  }
}

async function apiRequest(router: NextRouter, url: string, _data: any) {
  let data: { [key: string]: any };
  if (_data instanceof FormData) {
    data = {};
    for (const [key, val] of _data.entries()) {
      data[key] = val.toString();
    }
  } else {
    data = _data;
  }
  const res = await fetch(url, {
    method: "post",
    body: JSON.stringify({ _action: true, ...data }),
    headers: { "Content-Type": "application/json" },
  });

  if (res.ok) {
    const json = await res.json();
    if (json._error !== undefined) {
      throw new Error(json._error);
    }
    if (json._redirect) {
      json._redirect.replace
        ? router.replace(json._redirect.location)
        : router.push(json._redirect.location);
      return;
    }
    if (json._data !== undefined) {
      return json._data;
    }
    throw new Error("action returned no data or redirect");
  }
  throw new Error(`${res.statusText}: ${await res.text()}`);
}
