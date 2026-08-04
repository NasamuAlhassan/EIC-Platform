"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const callbackUrl = String(formData.get("callbackUrl") || "/portal");

  // Only allow same-site redirects — an attacker must not be able to bounce a
  // freshly-authenticated member off to another host.
  const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "/portal";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallback,
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
