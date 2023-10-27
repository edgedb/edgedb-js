import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/edgedb";
import { EmailPasswordSignupForm } from "../components";

export default async function Signup() {
  const session = await auth.getSession();

  if (await session.isLoggedIn()) {
    redirect("/");
  }

  return (
    <main>
      <h1>Sign up</h1>

      <EmailPasswordSignupForm />
      <Link href={"/"}>Home</Link>
      <Link href={"/signin"}>Sign in</Link>
    </main>
  );
}
