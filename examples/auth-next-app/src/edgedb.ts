import { createClient } from "edgedb";
import createAuth from "@edgedb/auth/helpers/next/app";

export const client = createClient({ tlsSecurity: "insecure" });
export const auth = createAuth(client, {
  baseUrl: "http://localhost:3000",
  authCookieName: "edgedb-auth-session",
});
