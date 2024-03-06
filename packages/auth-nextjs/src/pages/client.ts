import Router from "next/router";
import {
  type BuiltinProviderNames,
  NextAuthHelpers,
  type NextAuthOptions,
} from "../shared.client";
import { errorMapping } from "@edgedb/auth-core/dist/utils";

export * from "@edgedb/auth-core/dist/errors";
export { type NextAuthOptions, type BuiltinProviderNames };

export default function createNextPagesClientAuth(options: NextAuthOptions) {
  return new NextPagesClientAuth(options);
}

export class NextPagesClientAuth extends NextAuthHelpers {
  async emailPasswordSignIn(
    data: { email: string; password: string } | FormData
  ) {
    return await apiRequest(`${this._authRoute}/emailpassword/signin`, data);
  }

  async emailPasswordSignUp(
    data: { email: string; password: string } | FormData
  ) {
    return await apiRequest(`${this._authRoute}/emailpassword/signup`, data);
  }

  async emailPasswordSendPasswordResetEmail(
    data: { email: string } | FormData
  ) {
    return await apiRequest(
      `${this._authRoute}/emailpassword/send-reset-email`,
      data
    );
  }

  async emailPasswordResetPassword(
    data:
      | {
          reset_token: string;
          password: string;
        }
      | FormData
  ) {
    return await apiRequest(
      `${this._authRoute}/emailpassword/reset-password`,
      data
    );
  }

  async emailPasswordResendVerificationEmail(
    data:
      | {
          verification_token: string;
        }
      | FormData
  ) {
    return await apiRequest(
      `${this._authRoute}/emailpassword/resend-verification-email`,
      data
    );
  }
}

async function apiRequest(url: string, _data: any) {
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
      const errClass = errorMapping.get(json._error.type);
      if (errClass) {
        throw new (errClass as any)(json._error.message);
      }
      throw new Error(json._error.message);
    }
    if (json._redirect) {
      (await json._redirect.replace)
        ? Router.replace(json._redirect.location)
        : Router.push(json._redirect.location);
      return;
    }
    if (json._data !== undefined) {
      return json._data;
    }
    throw new Error("action returned no data or redirect");
  }
  throw new Error(`${res.statusText}: ${await res.text()}`);
}
