import createClientAuth from "@edgedb/auth-sveltekit/client";

/** @type {import('@edgedb/auth-sveltekit/client').AuthOptions} */
export const options = {
  baseUrl: "http://localhost:5173",
};

const auth = createClientAuth(options);

export default auth;
