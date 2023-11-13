import crypto from "node:crypto";
import { getClient, getConnectOptions } from "./testbase";
import { MockSMTPServer } from "./mock_smtp";

import { Auth } from "../src/core";

const SIGNING_KEY = crypto.randomBytes(32).toString("base64");

const smtpServer = new MockSMTPServer();

beforeAll(async () => {
  const client = getClient();

  const smtpAddress = await smtpServer.listen();

  try {
    await client.execute(`
    create extension pgcrypto;
    create extension auth;

    configure current database set
      ext::auth::AuthConfig::auth_signing_key := '${SIGNING_KEY}';

    configure current database set
      ext::auth::AuthConfig::token_time_to_live := <duration>'24 hours';

    configure current database set
      ext::auth::AuthConfig::allowed_redirect_urls := {'http://example.edgedb.com'};

    configure current database set
      ext::auth::SMTPConfig::sender := 'noreply@example.edgedb.com';
    configure current database set
      ext::auth::SMTPConfig::validate_certs := false;
    configure current database set
      ext::auth::SMTPConfig::host := ${JSON.stringify(smtpAddress.address)};
    configure current database set
      ext::auth::SMTPConfig::port := ${smtpAddress.port};

    configure current database
      insert ext::auth::EmailPasswordProviderConfig {};
    configure current database
      insert ext::auth::GitHubOAuthProvider {
        secret := 'secret',
        client_id := 'client_id',
      };
  `);

    // wait for config to be applied
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    client.close();
  }
}, 30_000);

afterAll(async () => {
  await smtpServer.close();
  // getClient().execute(`
  //   delete ext::auth::Factor;
  //   delete ext::auth::PKCEChallenge;
  //   delete ext::auth::Identity;
  // `);
});

test("test password signup/signin/reset flow", async () => {
  const client = getClient({ tlsSecurity: "insecure" });
  try {
    const auth = await Auth.create(client);

    const signupToken = await auth.signupWithEmailPassword(
      "test@example.edgedb.com",
      "supersecretpassword",
      "http://example.edgedb.com/verify"
    );

    expect(signupToken.status).toBe("verificationRequired");
    expect(typeof (signupToken as any).verifier).toBe("string");

    await expect(
      auth.signinWithEmailPassword(
        "test@example.edgedb.com",
        "supersecretpassword"
      )
    ).rejects.toThrow();

    const verifyEmail = await smtpServer.getMail();
    const verificationUrl = new URL(verifyEmail.text!.trim());

    expect(verificationUrl.origin).toBe("http://example.edgedb.com");
    expect(verificationUrl.pathname).toBe("/verify");
    expect(verificationUrl.searchParams.has("verification_token")).toBeTruthy();
    expect(verificationUrl.searchParams.get("provider")).toBe(
      "builtin::local_emailpassword"
    );
    expect(verificationUrl.searchParams.get("email")).toBe(
      "test@example.edgedb.com"
    );

    const verifyToken = await auth.verifyEmailPasswordSignup(
      verificationUrl.searchParams.get("verification_token")!,
      (signupToken as any).verifier
    );

    expect(typeof verifyToken.auth_token).toBe("string");
    expect(typeof verifyToken.identity_id).toBe("string");
    expect(verifyToken.provider_refresh_token).toBeNull();
    expect(verifyToken.provider_token).toBeNull();

    await expect(
      auth.signinWithEmailPassword("test@example.edgedb.com", "wrongpassword")
    ).rejects.toThrow();

    const signinToken = await auth.signinWithEmailPassword(
      "test@example.edgedb.com",
      "supersecretpassword"
    );

    const identity = (await client.withGlobals({
      "ext::auth::client_token": signinToken.auth_token,
    }).querySingle(`
      select global ext::auth::ClientTokenIdentity {
        *
      }
    `)) as any;
    expect(identity.id).toBe(signinToken.identity_id);

    const sentResetEmail = await auth.sendPasswordResetEmail(
      "test@example.edgedb.com",
      "http://example.edgedb.com/reset_password"
    );
    expect(sentResetEmail.email_sent).toBe("test@example.edgedb.com");
    expect(typeof sentResetEmail.verifier).toBe("string");

    const resetEmail = await smtpServer.getMail();
    const resetUrl = new URL(resetEmail.text!.trim());

    expect(resetUrl.origin).toBe("http://example.edgedb.com");
    expect(resetUrl.pathname).toBe("/reset_password");
    expect(resetUrl.searchParams.has("reset_token")).toBeTruthy();

    const resetAuthToken = await auth.resetPasswordWithResetToken(
      resetUrl.searchParams.get("reset_token")!,
      sentResetEmail.verifier,
      "newsecretpassword"
    );
    expect(typeof resetAuthToken.auth_token).toBe("string");
    expect(resetAuthToken.identity_id).toBe(identity.id);
  } finally {
    await client.close();
  }
}, 10_000);

test("get providers info", async () => {
  const client = getClient({ tlsSecurity: "insecure" });
  try {
    const auth = await Auth.create(client);

    const providersInfo = await auth.getProvidersInfo();

    expect(providersInfo).toEqual({
      oauth: [
        {
          name: "builtin::oauth_github",
          display_name: "GitHub",
        },
      ],
      emailPassword: true,
    });

    // check oauth provider info can be passed to getOAuthUrl
    auth
      .createPKCESession()
      .getOAuthUrl(
        providersInfo.oauth[0].name,
        "http://example.edgedb.com/callback"
      );
  } finally {
    await client.close();
  }
});

test("pkce session urls", async () => {
  const client = getClient({ tlsSecurity: "insecure" });
  try {
    const auth = await Auth.create(client);

    const pkceSession = auth.createPKCESession();

    expect(typeof pkceSession.verifier).toBe("string");
    expect(typeof pkceSession.challenge).toBe("string");

    const { port, database } = getConnectOptions();

    const githubOauthUrl = new URL(
      pkceSession.getOAuthUrl(
        "builtin::oauth_github",
        "http://example.edgedb.com/callback",
        "http://example.edgedb.com/signup_callback"
      )
    );
    expect(githubOauthUrl.origin).toBe(`http://localhost:${port}`);
    expect(githubOauthUrl.pathname).toBe(`/db/${database}/ext/auth/authorize`);
    expect(searchParamsToMap(githubOauthUrl.searchParams)).toEqual({
      challenge: pkceSession.challenge,
      provider: "builtin::oauth_github",
      redirect_to: "http://example.edgedb.com/callback",
      redirect_to_on_signup: "http://example.edgedb.com/signup_callback",
    });

    const uiSigninUrl = new URL(pkceSession.getHostedUISigninUrl());
    expect(uiSigninUrl.origin).toBe(`http://localhost:${port}`);
    expect(uiSigninUrl.pathname).toBe(`/db/${database}/ext/auth/ui/signin`);
    expect(searchParamsToMap(uiSigninUrl.searchParams)).toEqual({
      challenge: pkceSession.challenge,
    });

    const uiSignupUrl = new URL(pkceSession.getHostedUISignupUrl());
    expect(uiSignupUrl.origin).toBe(`http://localhost:${port}`);
    expect(uiSignupUrl.pathname).toBe(`/db/${database}/ext/auth/ui/signup`);
    expect(searchParamsToMap(uiSignupUrl.searchParams)).toEqual({
      challenge: pkceSession.challenge,
    });
  } finally {
    await client.close();
  }
});

function searchParamsToMap(params: URLSearchParams) {
  return [...params.entries()].reduce<{ [key: string]: string }>(
    (map, [key, val]) => {
      map[key] = val;
      return map;
    },
    {}
  );
}
