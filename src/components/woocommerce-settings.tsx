"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  connectWooCommerceAction,
  disconnectWooCommerceAction,
  testWooCommerceAction,
} from "@/app/app/settings/woocommerce-actions";
import type { WooCommerceStatus } from "@/lib/woocommerce/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusTone(status: WooCommerceStatus["status"]) {
  if (status === "connected") return "success" as const;
  if (status === "error") return "danger" as const;
  return "default" as const;
}

function statusLabel(status: WooCommerceStatus["status"]) {
  if (status === "connected") return "Connected";
  if (status === "error") return "Needs attention";
  return "Not connected";
}

export function WooCommerceSettings({ initial }: { initial: WooCommerceStatus }) {
  const [pending, startTransition] = useTransition();
  const [storeUrl, setStoreUrl] = useState(initial.storeUrl ?? "");

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
        connectWooCommerceAction({
          storeUrl: String(form.get("storeUrl") ?? ""),
          consumerKey: String(form.get("consumerKey") ?? ""),
          consumerSecret: String(form.get("consumerSecret") ?? ""),
        }),
      "WooCommerce store connected.",
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>WooCommerce</CardTitle>
          <Badge tone={statusTone(initial.status)}>{statusLabel(initial.status)}</Badge>
        </div>
        <CardDescription>
          Store URL plus a REST API consumer key and secret. Read-only is enough
          to pull products into the Inventory WooCommerce tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {initial.status === "connected" && initial.storeUrl ? (
          <p className="text-sm text-muted-foreground">
            Linked to{" "}
            <span className="text-foreground">{initial.storeUrl}</span>
            {initial.productCount
              ? ` · ${initial.productCount} product${initial.productCount === 1 ? "" : "s"} imported`
              : ""}
            {initial.lastVerifiedAt
              ? ` · checked ${new Date(initial.lastVerifiedAt).toLocaleString()}`
              : ""}
          </p>
        ) : null}
        {initial.lastError ? (
          <p className="text-sm text-destructive">{initial.lastError}</p>
        ) : null}

        <form onSubmit={onConnect} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="woo-store-url">Store URL</Label>
            <Input
              id="woo-store-url"
              name="storeUrl"
              value={storeUrl}
              onChange={(event) => setStoreUrl(event.target.value)}
              placeholder="https://www.sleepingdogammo.com"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="woo-key">Consumer key</Label>
            <Input
              id="woo-key"
              name="consumerKey"
              autoComplete="off"
              placeholder={initial.hasCredentials ? "Saved — enter to replace" : "ck_…"}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="woo-secret">Consumer secret</Label>
            <Input
              id="woo-secret"
              name="consumerSecret"
              type="password"
              autoComplete="new-password"
              placeholder={initial.hasCredentials ? "Saved — enter to replace" : "cs_…"}
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : "Connect and verify"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !initial.hasCredentials}
              onClick={() => run(() => testWooCommerceAction(), "Store API still works.")}
            >
              Test connection
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || initial.status === "disconnected"}
              onClick={() => run(() => disconnectWooCommerceAction(), "WooCommerce disconnected.")}
            >
              Disconnect
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
