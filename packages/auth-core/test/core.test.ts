import crypto from "node:crypto";
import { getClient } from "./testbase";

import { Auth } from "../src/core";

const SIGNING_KEY = crypto.randomBytes(32).toString("base64");

beforeAll(async () => {
  const client = getClient();

  try {
    await client.execute(`
    create extension pgcrypto;
    create extension auth;

    configure current database set
      ext::auth::AuthConfig::auth_signing_key := '${SIGNING_KEY}';

    configure current database set
      ext::auth::AuthConfig::token_time_to_live := <duration>'24 hours';

    configure current database set
      ext::auth::SMTPConfig::sender := 'noreply@example.edgedb.com';

    configure current database
      insert ext::auth::EmailPasswordProviderConfig {};
  `);

    // wait for config to be applied
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    client.close();
  }
}, 20_000);

test("test password signup/signin flow", async () => {
  const client = getClient({ tlsSecurity: "insecure" });
  try {
    const auth = await Auth.create(client);

    const signupToken = await auth.signupWithEmailPassword(
      "test@example.edgedb.com",
      "supersecretpassword",
    );

    expect(typeof signupToken.auth_token).toBe("string");
    expect(typeof signupToken.identity_id).toBe("string");
    expect(signupToken.provider_refresh_token).toBeNull();
    expect(signupToken.provider_token).toBeNull();

    await expect(
      auth.signinWithEmailPassword("test@example.edgedb.com", "wrongpassword"),
    ).rejects.toThrow();

    const signinToken = await auth.signinWithEmailPassword(
      "test@example.edgedb.com",
      "supersecretpassword",
    );

    const identity = (await client.withGlobals({
      "ext::auth::client_token": signinToken.auth_token,
    }).querySingle(`
    select assert_single(global ext::auth::ClientTokenIdentity {
      *
    })
  `)) as any;

    expect(identity.id).toBe(signinToken.identity_id);
  } finally {
    await client.close();
  }
});
