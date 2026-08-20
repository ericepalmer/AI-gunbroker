"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  connectShipStationAction,
  disconnectShipStationAction,
  testShipStationAction,
} from "@/app/app/settings/shipstation-actions";
import type { ShipStationStatus } from "@/lib/shipstation/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusTone(status: ShipStationStatus["status"]) {
  if (status === "connected") return "success" as const;
  if (status === "error") return "danger" as const;
  return "default" as const;
}

function statusLabel(status: ShipStationStatus["status"]) {
  if (status === "connected") return "Connected";
  if (status === "error") return "Needs attention";
  return "Not connected";
}

export function ShipStationSettings({ initial }: { initial: ShipStationStatus }) {
  const [pending, startTransition] = useTransition();

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
    run(
      () =>
        connectShipStationAction({
          apiKey: String(form.get("apiKey") ?? ""),
          apiSecret: String(form.get("apiSecret") ?? ""),
        }),
      "ShipStation connected.",
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>ShipStation</CardTitle>
          <Badge tone={statusTone(initial.status)}>{statusLabel(initial.status)}</Badge>
        </div>
        <CardDescription>
          API key and secret from ShipStation Settings → Account → API Settings. Closed
          GunBroker orders can be sent here for labels and tracking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {initial.status === "connected" ? (
          <p className="text-sm text-muted-foreground">
            Linked
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
            <Label htmlFor="ss-api-key">API key</Label>
            <Input
              id="ss-api-key"
              name="apiKey"
              autoComplete="off"
              required={!initial.hasCredentials}
              placeholder={initial.hasCredentials ? "Saved — enter to replace" : undefined}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ss-api-secret">API secret</Label>
            <Input
              id="ss-api-secret"
              name="apiSecret"
              type="password"
              autoComplete="new-password"
              required={!initial.hasCredentials}
              placeholder={initial.hasCredentials ? "Saved — enter to replace" : undefined}
            />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : initial.hasCredentials ? "Save and verify" : "Connect and verify"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !initial.hasCredentials}
              onClick={() => run(() => testShipStationAction(), "Connection still works.")}
            >
              Test saved credentials
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || initial.status === "disconnected"}
              onClick={() => run(() => disconnectShipStationAction(), "ShipStation disconnected.")}
            >
              Disconnect
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
