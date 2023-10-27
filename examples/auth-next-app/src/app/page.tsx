import { auth } from "@/edgedb";
import Link from "next/link";
import { SignOutAction } from "./components";

export default async function Home() {
  const session = await auth.getSession();

  const loggedIn = await session.isLoggedIn();

  return (
    <main>
      <h1>Home</h1>

      {loggedIn ? (
        <>
          <div>You are logged in</div>
          <a href={auth.getSignoutUrl()}>Sign out link</a>
          <SignOutAction />
        </>
      ) : (
        <>
          <div>You are not logged in</div>
          <Link href={"/signin"}>Sign in</Link>
          <Link href={"/signup"}>Sign up</Link>
          <a href={auth.getBuiltinUIUrl()}>Sign in with Builtin UI</a>
        </>
      )}
    </main>
  );
}
