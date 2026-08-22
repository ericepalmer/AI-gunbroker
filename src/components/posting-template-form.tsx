"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { savePostingTemplateAction } from "@/app/app/inventory/defaults/actions";
import type {
  PaymentMethodKey,
  ShippingClassKey,
} from "@/lib/gunbroker/types";
import {
  AUTO_RELIST_OPTIONS,
  CONDITION_OPTIONS,
  LISTING_DURATION_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  RETURN_POLICY_OPTIONS,
  SHIPPING_CLASS_OPTIONS,
  US_STATE_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  WHO_PAYS_OPTIONS,
} from "@/lib/gunbroker/types";
import type {
  PostingTemplateDetail,
  PostingTemplateInput,
} from "@/lib/gunbroker/posting-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

function inputFrom(initial: PostingTemplateDetail): PostingTemplateInput {
  return {
    isFixedPrice: initial.isFixedPrice,
    listingDuration: initial.listingDuration,
    autoRelist: initial.autoRelist,
    autoRelistFixedCount: initial.autoRelistFixedCount,
    defaultCondition: initial.defaultCondition,
    weight: initial.weight,
    weightUnit: initial.weightUnit,
    inspectionPeriod: initial.inspectionPeriod,
    whoPaysForShipping: initial.whoPaysForShipping,
    shippingProfileId: initial.shippingProfileId,
    shippingClasses: { ...initial.shippingClasses },
    shippingClassCosts: { ...initial.shippingClassCosts },
    paymentMethods: { ...initial.paymentMethods },
    excludeStates: [...initial.excludeStates],
    willShipInternational: initial.willShipInternational,
    prop65Warning: initial.prop65Warning,
    canOffer: initial.canOffer,
    standardTextId: initial.standardTextId,
    collectorsElite: initial.collectorsElite,
  };
}

const selectClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30";

export function PostingTemplateForm({ initial }: { initial: PostingTemplateDetail }) {
  const [saved, setSaved] = useState(initial);
  const [edits, setEdits] = useState<PostingTemplateInput>(() => inputFrom(initial));
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () => JSON.stringify(edits) !== JSON.stringify(inputFrom(saved)),
    [edits, saved],
  );

  function setField<K extends keyof PostingTemplateInput>(
    key: K,
    value: PostingTemplateInput[K],
  ) {
    setEdits((current) => ({ ...current, [key]: value }));
  }

  function setPayment(key: PaymentMethodKey, value: boolean) {
    setEdits((current) => ({
      ...current,
      paymentMethods: { ...current.paymentMethods, [key]: value },
    }));
  }

  function setShippingClass(key: ShippingClassKey, value: boolean) {
    setEdits((current) => ({
      ...current,
      shippingClasses: { ...current.shippingClasses, [key]: value },
      whoPaysForShipping:
        value && current.whoPaysForShipping === 16 ? 4 : current.whoPaysForShipping,
    }));
  }

  function setShippingCost(key: ShippingClassKey, value: number | null) {
    setEdits((current) => ({
      ...current,
      shippingClassCosts: { ...current.shippingClassCosts, [key]: value },
    }));
  }

  function setExcludeState(code: string, checked: boolean) {
    setEdits((current) => ({
      ...current,
      excludeStates: checked
        ? [...current.excludeStates, code].sort()
        : current.excludeStates.filter((state) => state !== code),
    }));
  }

  function save() {
    startTransition(async () => {
      const result = await savePostingTemplateAction(edits);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(result.template);
      setEdits(inputFrom(result.template));
      toast.success("Defaults saved.");
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="template-listing-type">Listing type</Label>
        <select
          id="template-listing-type"
          value={edits.isFixedPrice ? "fixed" : "auction"}
          onChange={(event) => setField("isFixedPrice", event.target.value === "fixed")}
          className={selectClassName}
        >
          <option value="fixed">Fixed price</option>
          <option value="auction">Auction</option>
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="template-duration">Duration</Label>
          <select
            id="template-duration"
            value={edits.listingDuration ?? ""}
            onChange={(event) =>
              setField(
                "listingDuration",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className={selectClassName}
          >
            <option value="">Listing duration</option>
            {LISTING_DURATION_OPTIONS.filter(
              (option) =>
                !option.fixedOnly || edits.isFixedPrice || edits.listingDuration === option.value,
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-autorelist">Auto-relist</Label>
          <select
            id="template-autorelist"
            value={edits.autoRelist ?? ""}
            onChange={(event) =>
              setField("autoRelist", event.target.value ? Number(event.target.value) : null)
            }
            className={selectClassName}
          >
            <option value="">Auto-relist</option>
            {AUTO_RELIST_OPTIONS.filter((option) =>
              edits.isFixedPrice ? option.value !== 2 : option.value !== 4,
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {edits.autoRelist === 3 ? (
          <div className="space-y-1.5">
            <Label htmlFor="template-autorelist-count">Times to relist</Label>
            <Input
              id="template-autorelist-count"
              type="number"
              min={1}
              step={1}
              value={edits.autoRelistFixedCount ?? ""}
              onChange={(event) => {
                const value = event.target.value.trim();
                setField(
                  "autoRelistFixedCount",
                  value ? Math.max(1, Math.round(Number(value)) || 1) : null,
                );
              }}
            />
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="template-condition">Default condition</Label>
          <p className="text-xs text-muted-foreground">
            Used when WooCommerce has no factory condition.
          </p>
          <select
            id="template-condition"
            value={edits.defaultCondition ?? ""}
            onChange={(event) =>
              setField(
                "defaultCondition",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className={selectClassName}
          >
            <option value="">Select condition</option>
            {CONDITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-weight">Default weight</Label>
          <p className="text-xs text-muted-foreground">
            Used when the product has no weight on WooCommerce or GunBroker.
          </p>
          <div className="flex gap-2">
            <Input
              id="template-weight"
              type="number"
              min={0}
              step="0.01"
              value={edits.weight ?? ""}
              onChange={(event) => setField("weight", parseMoney(event.target.value))}
            />
            <select
              id="template-weight-unit"
              aria-label="Weight unit"
              value={edits.weightUnit ?? 1}
              onChange={(event) => setField("weightUnit", Number(event.target.value) || 1)}
              className={selectClassName}
            >
              {WEIGHT_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Payment</Label>
        <p className="text-xs text-muted-foreground">Buyers need at least one option.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-accent"
                checked={edits.paymentMethods[option.key]}
                onChange={(event) => setPayment(option.key, event.target.checked)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-who-pays">Shipping</Label>
        <select
          id="template-who-pays"
          value={edits.whoPaysForShipping ?? ""}
          onChange={(event) =>
            setField(
              "whoPaysForShipping",
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className={selectClassName}
        >
          <option value="">Who pays for shipping</option>
          {WHO_PAYS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {edits.whoPaysForShipping === 16 ? (
          <div className="space-y-1.5">
            <Label htmlFor="template-shipping-profile">Shipping profile ID</Label>
            <Input
              id="template-shipping-profile"
              type="number"
              min={1}
              step={1}
              value={edits.shippingProfileId ?? ""}
              onChange={(event) => {
                const value = event.target.value.trim();
                setField("shippingProfileId", value ? Number(value) : null);
              }}
            />
          </div>
        ) : (
          <div className="grid gap-2">
            {SHIPPING_CLASS_OPTIONS.map((option) => (
              <div key={option.key} className="flex items-center gap-2 text-sm">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-accent"
                    checked={edits.shippingClasses[option.key]}
                    onChange={(event) => setShippingClass(option.key, event.target.checked)}
                  />
                  {option.label}
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Cost"
                  disabled={!edits.shippingClasses[option.key]}
                  value={
                    edits.shippingClasses[option.key]
                      ? (edits.shippingClassCosts[option.key] ?? "")
                      : ""
                  }
                  onChange={(event) =>
                    setShippingCost(option.key, parseMoney(event.target.value))
                  }
                  className="h-8 w-28"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-return-policy">Return policy</Label>
        <select
          id="template-return-policy"
          value={edits.inspectionPeriod ?? ""}
          onChange={(event) =>
            setField(
              "inspectionPeriod",
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className={selectClassName}
        >
          <option value="">No return policy</option>
          {RETURN_POLICY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Cannot sell to</Label>
        <p className="text-xs text-muted-foreground">
          Checked states cannot buy listings created from this template.
        </p>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
          {US_STATE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-border accent-accent"
                checked={edits.excludeStates.includes(option.value)}
                onChange={(event) => setExcludeState(option.value, event.target.checked)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-accent"
            checked={edits.willShipInternational}
            onChange={(event) => setField("willShipInternational", event.target.checked)}
          />
          Ship internationally
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-accent"
            checked={edits.canOffer}
            onChange={(event) => setField("canOffer", event.target.checked)}
          />
          Accept best offers
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-accent"
            checked={edits.collectorsElite}
            onChange={(event) => setField("collectorsElite", event.target.checked)}
          />
          Collector&apos;s Elite
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="template-standard-text">Standard text ID</Label>
          <Input
            id="template-standard-text"
            type="number"
            min={1}
            step={1}
            value={edits.standardTextId ?? ""}
            onChange={(event) => {
              const value = event.target.value.trim();
              setField("standardTextId", value ? Number(value) : null);
            }}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="template-prop65">Prop 65 warning</Label>
          <Textarea
            id="template-prop65"
            value={edits.prop65Warning}
            onChange={(event) => setField("prop65Warning", event.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Last saved {new Date(saved.updatedAt).toLocaleString()}
        </p>
        <Button type="button" disabled={!dirty || pending} onClick={save}>
          {pending ? "Saving…" : "Save defaults"}
        </Button>
      </div>
    </div>
  );
}
