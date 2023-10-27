import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/edgedb";
import { EmailPasswordSigninForm } from "../components";

export default async function Signin() {
  const session = await auth.getSession();

  if (await session.isLoggedIn()) {
    redirect("/");
  }

  return (
    <main>
      <h1>Signin</h1>

      <a href={auth.getOAuthUrl("builtin::oauth_github")}>
        Sign in with Github
      </a>
      <EmailPasswordSigninForm />

      <Link href={"/"}>Home</Link>
      <Link href={"/signup"}>Sign up</Link>
    </main>
  );
}
