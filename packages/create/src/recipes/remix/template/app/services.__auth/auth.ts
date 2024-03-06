import createClientAuth, {
  type RemixAuthOptions,
} from "@edgedb/auth-remix/client";

export const options: RemixAuthOptions = {
  baseUrl: "http://localhost:3000",
};

const auth = createClientAuth(options);

export default auth;
