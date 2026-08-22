"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GunBrokerSettings } from "@/components/gunbroker-settings";
import { ShipStationSettings } from "@/components/shipstation-settings";
import { WooCommerceSettings } from "@/components/woocommerce-settings";
import type { GunBrokerStatus } from "@/lib/gunbroker/types";
import type { ShipStationStatus } from "@/lib/shipstation/types";
import type { WooCommerceStatus } from "@/lib/woocommerce/types";

type SessionRow = {
  id: string;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function AccountSettings({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [pending, setPending] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const { error } = await authClient.updateUser({
      name: String(form.get("name") ?? ""),
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not update profile.");
      return;
    }
    toast.success("Profile saved.");
  }

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const newEmail = String(form.get("newEmail") ?? "");
    const { error } = await authClient.changeEmail({
      newEmail,
      callbackURL: "/app/settings",
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not start the email change.");
      return;
    }
    toast.success("Check the new inbox to confirm the change.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How your name appears on this desk.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={name} required />
            </div>
            <Button type="submit" disabled={pending}>
              Save name
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Current login is {email}. Changing it sends a confirmation to the new
            address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changeEmail} className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newEmail">New email</Label>
              <Input id="newEmail" name="newEmail" type="email" required />
            </div>
            <Button type="submit" disabled={pending}>
              Send confirmation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SecuritySettings() {
  const [pending, setPending] = useState(false);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (newPassword !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not change password.");
      return;
    }
    form.reset();
    toast.success("Password updated. Other sessions were signed out.");
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const { error } = await authClient.deleteUser({ password });
    if (error) {
      toast.error(error.message ?? "Could not start account deletion.");
      return;
    }
    toast.success("Check your email to confirm deletion.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use at least 8 characters. Other devices will need to sign in again.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Sends a confirmation email. GunBroker listings stay on GunBroker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={deleteAccount} className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="delete-password">Confirm with your password</Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" variant="destructive">
              Email me a deletion link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SessionSettings({
  currentToken,
  initialSessions,
}: {
  currentToken?: string;
  initialSessions: SessionRow[];
}) {
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data, error } = await authClient.listSessions();
    if (error) {
      toast.error(error.message ?? "Could not load sessions.");
      setLoading(false);
      return;
    }
    setSessions((data ?? []) as SessionRow[]);
    setLoading(false);
  }

  async function revoke(token: string) {
    const { error } = await authClient.revokeSession({ token });
    if (error) {
      toast.error(error.message ?? "Could not revoke session.");
      return;
    }
    toast.success("Session revoked.");
    void load();
  }

  async function revokeOthers() {
    const { error } = await authClient.revokeOtherSessions();
    if (error) {
      toast.error(error.message ?? "Could not revoke other sessions.");
      return;
    }
    toast.success("Signed out everywhere else.");
    void load();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Devices currently signed in to Chamber.</CardDescription>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={revokeOthers}>
            Sign out other devices
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading sessions…</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((session) => {
              const current = session.token === currentToken;
              return (
                <li key={session.id} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm">
                      {session.userAgent || "Unknown browser"}
                      {current ? (
                        <Badge tone="accent" className="ml-2">
                          This device
                        </Badge>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {session.ipAddress || "IP hidden"} · expires{" "}
                      {new Date(session.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  {current ? null : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => revoke(session.token)}>
                      Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ConnectionSettings({
  gunbroker,
  woocommerce,
  shipstation,
}: {
  gunbroker: GunBrokerStatus;
  woocommerce: WooCommerceStatus;
  shipstation: ShipStationStatus;
}) {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="grid gap-4">
      <div id="connection-gunbroker" className="scroll-mt-6">
        <GunBrokerSettings initial={gunbroker} />
      </div>
      <div id="connection-woocommerce" className="scroll-mt-6">
        <WooCommerceSettings initial={woocommerce} />
      </div>
      <div id="connection-shipstation" className="scroll-mt-6">
        <ShipStationSettings initial={shipstation} />
      </div>
    </div>
  );
}
