import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      position?: string | null;
      avatarUrl?: string | null;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    position?: string | null;
    avatarUrl?: string | null;
    mustChangePassword?: boolean;
  }
}

// `next-auth/jwt` only re-exports from `@auth/core/jwt`, so the JWT interface
// has to be augmented at its source for the extra claims to be visible.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    position?: string | null;
    avatarUrl?: string | null;
    mustChangePassword?: boolean;
  }
}

export {};
