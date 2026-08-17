import "server-only";
import { auth } from "./config";
import { prisma } from "@/lib/db/client";

/** Returns the session only if the caller is signed in, else null. */
export async function requireUserSession() {
  const session = await auth();
  return session?.user ? session : null;
}

/** Returns the session only if the caller is an authenticated admin, else null. */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

/**
 * Returns the session plus the caller's own Driver.id only if the caller
 * is signed in with the DRIVER role and has a linked Driver profile
 * (Driver.userId), else null. A DRIVER-role user with no linked profile
 * yet (shouldn't normally happen, but not fabricated around) is treated
 * as not authorized rather than guessed at.
 */
export async function requireDriverSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return null;
  }
  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!driver) {
    return null;
  }
  return { session, driverId: driver.id };
}
