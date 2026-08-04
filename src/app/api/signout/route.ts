import { signOut } from "@/lib/auth";

/**
 * A POST-only sign-out endpoint, so signing out can't be triggered by a stray
 * GET (a prefetched link, an <img> tag on another site).
 */
export async function POST() {
  await signOut({ redirectTo: "/" });
}
