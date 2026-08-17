import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
  }
}

// next-auth/jwt.d.ts is a bare `export * from "@auth/core/jwt"` — augmenting
// that specifier doesn't merge through the re-export, so target the actual
// declaration site instead.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
