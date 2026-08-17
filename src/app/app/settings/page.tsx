import { AccountSettings, ConnectionSettings, SecuritySettings, SessionSettings } from "@/components/settings-forms";
import { auth } from "@/lib/auth";
import { getGunBrokerStatus } from "@/lib/gunbroker/service";
import { getSession } from "@/lib/session";
import { headers } from "next/headers";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  const { tab } = await searchParams;
  const current = tab === "security" || tab === "sessions" || tab === "connections" ? tab : "account";
  const sessions =
    current === "sessions"
      ? await auth.api.listSessions({
          headers: await headers(),
        })
      : [];
  const gunbroker =
    current === "connections" ? await getGunBrokerStatus(session!.user.id) : null;

  const tabs = [
    ["account", "Account"],
    ["security", "Security"],
    ["sessions", "Sessions"],
    ["connections", "Connections"],
  ] as const;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">Settings</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Your desk</h1>
      <p className="mt-2 text-muted-foreground">
        Connect GunBroker on the Connections tab. ShipStation and WooCommerce
        still wait for later builds.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <a
            key={id}
            href={`/app/settings?tab=${id}`}
            className={
              current === id
                ? "rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground"
                : "rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {label}
          </a>
        ))}
      </div>
      <div className="mt-6">
        {current === "account" ? (
          <AccountSettings name={session!.user.name} email={session!.user.email} />
        ) : null}
        {current === "security" ? <SecuritySettings /> : null}
        {current === "sessions" ? (
          <SessionSettings
            currentToken={session!.session.token}
            initialSessions={sessions}
          />
        ) : null}
        {current === "connections" && gunbroker ? (
          <ConnectionSettings gunbroker={gunbroker} />
        ) : null}
      </div>
    </div>
  );
}
