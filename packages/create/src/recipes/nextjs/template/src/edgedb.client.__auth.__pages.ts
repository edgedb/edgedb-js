import createAuth, {
  type NextAuthOptions,
} from "@edgedb/auth-nextjs/pages/client";

export const options: NextAuthOptions = {
  baseUrl: "http://localhost:3000",
};

export const auth = createAuth(options);
