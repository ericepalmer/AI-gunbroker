"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  connectGunBrokerAction,
  disconnectGunBrokerAction,
  pingGunBrokerAction,
  testGunBrokerAction,
} from "@/app/app/settings/gunbroker-actions";
import type { GunBrokerStatus } from "@/lib/gunbroker/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusTone(status: GunBrokerStatus["status"]) {
  if (status === "connected") return "success" as const;
  if (status === "error") return "danger" as const;
  return "default" as const;
}

function statusLabel(status: GunBrokerStatus["status"]) {
  if (status === "connected") return "Connected";
  if (status === "error") return "Needs attention";
  return "Not connected";
}

export function GunBrokerSettings({ initial }: { initial: GunBrokerStatus }) {
  const [pending, startTransition] = useTransition();
  const [pingMessage, setPingMessage] = useState<string | null>(
    initial.apiReachable ? "API responded." : initial.apiError,
  );

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
      } else {
        toast.error(result.error);
      }
    });
  }

  function onConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    run(
      () => connectGunBrokerAction({ username, password }),
      "GunBroker account connected.",
    );
  }

  function onPing() {
    startTransition(async () => {
      const result = await pingGunBrokerAction();
      if (result.ok) {
        setPingMessage("API responded.");
        toast.success("GunBroker API is reachable.");
      } else {
        setPingMessage(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>GunBroker</CardTitle>
          <Badge tone={statusTone(initial.status)}>{statusLabel(initial.status)}</Badge>
        </div>
        <CardDescription>
          Connect the seller login for this Chamber account. Each account has one
          GunBroker connection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-border bg-background p-4 text-sm">
          {initial.devKeyConfigured ? (
            <p className="text-muted-foreground">{pingMessage ?? "API is ready."}</p>
          ) : (
            <p className="text-muted-foreground">
              GunBroker is not configured on this server.
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={onPing}
            disabled={pending || !initial.devKeyConfigured}
          >
            Test API
          </Button>
        </div>

        {initial.status === "connected" && initial.externalUsername ? (
          <p className="text-sm text-muted-foreground">
            Linked as{" "}
            <span className="text-foreground">{initial.externalUsername}</span>
            {initial.externalUserId ? ` · user ${initial.externalUserId}` : ""}
            {initial.lastVerifiedAt
              ? ` · checked ${new Date(initial.lastVerifiedAt).toLocaleString()}`
              : ""}
          </p>
        ) : null}
        {initial.lastError ? (
          <p className="text-sm text-destructive">{initial.lastError}</p>
        ) : null}

        <form onSubmit={onConnect} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="gb-username">Username</Label>
            <Input
              id="gb-username"
              name="username"
              autoComplete="off"
              defaultValue={initial.username ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="gb-password">Password</Label>
            <Input
              id="gb-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={initial.hasPassword ? "Saved — enter to replace" : undefined}
              required
            />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={pending || !initial.devKeyConfigured}>
              {pending ? "Working…" : "Connect and verify"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !initial.hasPassword}
              onClick={() => run(() => testGunBrokerAction(), "Connection still works.")}
            >
              Test saved login
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || initial.status === "disconnected"}
              onClick={() => run(() => disconnectGunBrokerAction(), "GunBroker disconnected.")}
            >
              Disconnect
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
