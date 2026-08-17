"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { isAdminRole } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  emailVerified: boolean;
  createdAt: Date | string;
};

export function AdminUsers({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: AdminUser[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(search = query) {
    setLoading(true);
    const { data, error } = await authClient.admin.listUsers({
      query: {
        limit: 50,
        offset: 0,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...(search
          ? { searchValue: search, searchField: "email" as const, searchOperator: "contains" as const }
          : {}),
      },
    });
    if (error) {
      toast.error(error.message ?? "Could not load users.");
      setLoading(false);
      return;
    }
    setUsers((data?.users ?? []) as AdminUser[]);
    setLoading(false);
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const role = data.get("role") === "admin" ? "admin" : "user";
    const { error } = await authClient.admin.createUser({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      role,
    });
    if (error) {
      toast.error(error.message ?? "Could not create user.");
      return;
    }
    form.reset();
    toast.success("User created.");
    void load();
  }

  async function setRole(userId: string, role: "user" | "admin") {
    const { error } = await authClient.admin.setRole({ userId, role });
    if (error) {
      toast.error(error.message ?? "Could not change role.");
      return;
    }
    toast.success("Role updated.");
    void load();
  }

  async function toggleBan(user: AdminUser) {
    if (user.banned) {
      const { error } = await authClient.admin.unbanUser({ userId: user.id });
      if (error) {
        toast.error(error.message ?? "Could not unban.");
        return;
      }
      toast.success("User restored.");
    } else {
      const { error } = await authClient.admin.banUser({
        userId: user.id,
        banReason: "Suspended by admin",
      });
      if (error) {
        toast.error(error.message ?? "Could not ban.");
        return;
      }
      toast.success("User banned.");
    }
    void load();
  }

  async function setPassword(userId: string) {
    const password = window.prompt("New password (min 8 characters)");
    if (!password) return;
    const { error } = await authClient.admin.setUserPassword({
      userId,
      newPassword: password,
    });
    if (error) {
      toast.error(error.message ?? "Could not set password.");
      return;
    }
    toast.success("Password replaced.");
  }

  async function revokeSessions(userId: string) {
    const { error } = await authClient.admin.revokeUserSessions({ userId });
    if (error) {
      toast.error(error.message ?? "Could not revoke sessions.");
      return;
    }
    toast.success("Sessions revoked.");
  }

  async function impersonate(userId: string) {
    const { error } = await authClient.admin.impersonateUser({ userId });
    if (error) {
      toast.error(error.message ?? "Could not impersonate.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
          <CardDescription>Adds a login without waiting on public signup.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue="user"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create account</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>Ban, promote, reset passwords, or impersonate for support.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void load(query);
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search email"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Person</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-3">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="py-3">
                        <Badge tone={isAdminRole(user.role) ? "accent" : "default"}>
                          {user.role || "user"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {user.banned ? (
                          <Badge tone="danger">Banned</Badge>
                        ) : user.emailVerified ? (
                          <Badge tone="success">Verified</Badge>
                        ) : (
                          <Badge>Unverified</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.id === currentUserId ? (
                            <span className="text-xs text-muted-foreground">You</span>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setRole(user.id, isAdminRole(user.role) ? "user" : "admin")
                                }
                              >
                                {isAdminRole(user.role) ? "Make user" : "Make admin"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleBan(user)}
                              >
                                {user.banned ? "Unban" : "Ban"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setPassword(user.id)}
                              >
                                Password
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => revokeSessions(user.id)}
                              >
                                Sessions
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => impersonate(user.id)}
                              >
                                Impersonate
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
