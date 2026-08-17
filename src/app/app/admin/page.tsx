import { AdminUsers } from "@/components/admin-users";
import { auth } from "@/lib/auth";
import { getSession, sessionIsAdmin } from "@/lib/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await getSession();
  if (!sessionIsAdmin(session)) {
    redirect("/app");
  }

  const listed = await auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: 50,
      offset: 0,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">Admin</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">User management</h1>
      <p className="mt-2 text-muted-foreground">
        Create logins, change roles, ban abuse, and impersonate for support.
      </p>
      <div className="mt-8">
        <AdminUsers currentUserId={session!.user.id} initialUsers={listed.users} />
      </div>
    </div>
  );
}
