"use client";

import { startTransition } from "react";
import {
  // @ts-ignore
  experimental_useFormState,
  // @ts-ignore
  experimental_useFormStatus,
} from "react-dom";

import { redirect } from "next/navigation";

import * as actions from "@/actions";

export function SignOutAction() {
  return (
    <button
      onClick={() =>
        startTransition(() => {
          actions.signout();
        })
      }
    >
      Sign out action
    </button>
  );
}

interface SigninState {
  message: string | null;
}

async function signinWithState(
  prevState: SigninState | void,
  formData: FormData
) {
  try {
    await actions.emailPasswordSignIn(formData);
  } catch (e) {
    return { message: e instanceof Error ? e.message : String(e) };
  }
  redirect("/");
}

export function EmailPasswordSigninForm() {
  const [state, formAction] = experimental_useFormState<
    SigninState | void,
    FormData
  >(signinWithState, undefined);

  return (
    <form action={formAction}>
      <p>{state ? state.message : null}</p>
      <label htmlFor="email">Email</label>
      <input type="email" id="email" name="email" required />
      <label htmlFor="password">Password</label>
      <input type="password" id="password" name="password" required />
      <SubmitButton type="in" />
    </form>
  );
}

async function signupWithState(
  prevState: SigninState | void,
  formData: FormData
) {
  try {
    const tokenData = await actions.emailPasswordSignUp(formData);
    if (!tokenData) {
      return {
        message: `Follow the link in the verification email to finish registration`,
      };
    }
  } catch (e) {
    return { message: `Error: ${e instanceof Error ? e.message : String(e)}` };
  }
  redirect("/");
}

export function EmailPasswordSignupForm() {
  const [state, formAction] = experimental_useFormState<
    SigninState | void,
    FormData
  >(signupWithState, undefined);

  return (
    <form action={formAction}>
      <p>{state ? state.message : null}</p>
      <label htmlFor="email">Email</label>
      <input type="email" id="email" name="email" required />
      <label htmlFor="password">Password</label>
      <input type="password" id="password" name="password" required />
      <SubmitButton type="up" />
    </form>
  );
}

function SubmitButton({ type }: { type: string }) {
  const { pending } = experimental_useFormStatus();

  return (
    <button type="submit" aria-disabled={pending}>
      {pending ? "Signing " : "Sign "}
      {type}
    </button>
  );
}
