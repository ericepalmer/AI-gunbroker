"use client";

import { authClient } from "@/lib/auth-client";
import { isAdminRole } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, LayoutDashboard, LogOut, Package, Settings, Shield, Truck } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/inventory", label: "Inventory", icon: Boxes },
  { href: "/app/sold", label: "Sold / ship", icon: Truck },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  user,
}: {
  user: { name: string; email: string; role?: string | null };
}) {
  const router = useRouter();
  const admin = isAdminRole(user.role);

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link href="/app">
          <Logo />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
        {admin ? (
          <Link
            href="/app/admin"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        ) : null}
        {process.env.NODE_ENV !== "production" ? (
          <Link
            href="/dev/inbox"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Package className="h-4 w-4" />
            Dev inbox
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-border p-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        <button
          type="button"
          onClick={signOut}
          className={cn(
            "mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground",
          )}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
