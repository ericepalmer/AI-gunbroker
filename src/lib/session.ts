import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/utils";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return session;
}

export function sessionIsAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  return isAdminRole(session?.user.role);
}
