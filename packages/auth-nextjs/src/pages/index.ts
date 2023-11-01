import { Client } from "edgedb";
import { NextAuth, NextAuthOptions, NextAuthSession } from "../shared";

export { type NextAuthOptions, NextAuthSession };

export class NextPagesAuth extends NextAuth {
  getSession(req: {
    cookies: Partial<{
      [key: string]: string;
    }>;
  }) {
    return new NextAuthSession(
      this.client,
      req.cookies[this.options.authCookieName]?.split(";")[0]
    );
  }
}

export default function createNextPagesAuth(
  client: Client,
  options: NextAuthOptions
) {
  return new NextPagesAuth(client, options);
}

async function apiRequest(url: string, data: any) {
  const res = await fetch(url, {
    method: "post",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
  if (res.ok) {
    return;
  }
  throw new Error(`${res.statusText}: ${await res.text()}`);
}

export function getClientActions(options: NextAuthOptions) {
  const authRoute = `${options.baseUrl}/${options.authRoutesPath}`;

  return {
    // signout: async () => {
    // },
    emailPasswordSignIn: async (data: { email: string; password: string }) => {
      await apiRequest(`${authRoute}/emailpassword/signin`, data);
    },
    emailPasswordSignUp: async (data: { email: string; password: string }) => {
      await apiRequest(`${authRoute}/emailpassword/signup`, data);
    },
    emailPasswordSendPasswordResetEmail: async (data: { email: string }) => {
      await apiRequest(`${authRoute}/emailpassword/send-reset-email`, data);
    },
    emailPasswordResetPassword: async (data: {
      resetToken: string;
      password: string;
    }) => {
      await apiRequest(`${authRoute}/emailpassword/reset-password`, data);
    },
    emailPasswordResendVerificationEmail: async (data: {
      verification_token: string;
    }) => {
      await apiRequest(
        `${authRoute}/emailpassword/resend-verification-email`,
        data
      );
    },
  };
}
