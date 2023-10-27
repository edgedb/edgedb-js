"use server";

import { auth } from "@/edgedb";

const { signout, emailPasswordSignIn, emailPasswordSignUp } =
  auth.createServerActions();

export { signout, emailPasswordSignIn, emailPasswordSignUp };
