"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const callbackUrl = String(formData.get("callbackUrl") || "/portal");

  // Only allow same-site redirects — an attacker must not be able to bounce a
  // freshly-authenticated member off to another host.
  const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "/portal";

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  /*
   * Send someone on a temporary password straight to the page that makes them
   * change it, rather than to the dashboard that would immediately redirect
   * them there.
   *
   * The destination is decided here because the alternative — landing on
   * /portal and bouncing — is two navigations deep into a server action, and
   * Next renders that second hop as a blank page until the browser is
   * refreshed. Every member hits this on their first sign-in, so it is not a
   * rare edge.
   *
   * This is only choosing a destination. It reveals nothing: the address is one
   * the visitor just typed, the answer is the same whether or not the account
   * exists, and `signIn` below still has to accept the password.
   */
  let target = safeCallback;
  if (email) {
    const pending = await db.user.findUnique({
      where: { email },
      select: { mustChangePassword: true },
    });
    if (pending?.mustChangePassword) target = "/portal/profile";
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: target,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "That email and password don't match an account."
            : "Something went wrong signing you in. Please try again.",
      };
    }
    // signIn throws a NEXT_REDIRECT on success — let it bubble.
    throw error;
  }
}
