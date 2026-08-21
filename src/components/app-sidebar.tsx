"use client";

import { authClient } from "@/lib/auth-client";
import {
  GUNBROKER_INVENTORY_PATH,
  isGunBrokerInventoryPath,
  isWooCommerceInventoryPath,
  WOOCOMMERCE_INVENTORY_PATH,
} from "@/lib/inventory-paths";
import { isAdminRole } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package, Settings, Shield, Store, Target, Truck } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, active: (p: string) => p === "/app" },
  {
    href: WOOCOMMERCE_INVENTORY_PATH,
    label: "WooCommerce inventory",
    icon: Store,
    active: isWooCommerceInventoryPath,
  },
  {
    href: GUNBROKER_INVENTORY_PATH,
    label: "GunBroker inventory",
    icon: Target,
    active: isGunBrokerInventoryPath,
  },
  { href: "/app/sold", label: "Sold / ship", icon: Truck, active: (p: string) => p === "/app/sold" },
  {
    href: "/app/settings",
    label: "Settings",
    icon: Settings,
    active: (p: string) => p.startsWith("/app/settings"),
  },
];

export function AppSidebar({
  user,
}: {
  user: { name: string; email: string; role?: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const admin = isAdminRole(user.role);

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-3">
        <Link href="/app">
          <Logo />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2 text-xs">
        {links.map((link) => {
          const active = link.active(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5",
                active
                  ? "bg-accent/15 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <link.icon className="h-3.5 w-3.5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
        {admin ? (
          <Link
            href="/app/admin"
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5",
              pathname.startsWith("/app/admin")
                ? "bg-accent/15 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin
          </Link>
        ) : null}
        {process.env.NODE_ENV !== "production" ? (
          <Link
            href="/dev/inbox"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Package className="h-3.5 w-3.5" />
            Dev inbox
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-border p-3">
        <p className="truncate text-xs font-medium">{user.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
        <button
          type="button"
          onClick={signOut}
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground",
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
