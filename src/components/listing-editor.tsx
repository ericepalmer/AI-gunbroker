"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { commitListingAction } from "@/app/app/inventory/actions";
import type {
  ListingDetail,
  ListingEdits,
  PaymentMethodKey,
  PremiumFlagKey,
  ShippingClassKey,
  TitleColor,
} from "@/lib/gunbroker/types";
import {
  AUTO_RELIST_OPTIONS,
  CONDITION_OPTIONS,
  emptyPaymentMethods,
  emptyPremiumFeatures,
  emptyShippingClassCosts,
  emptyShippingClasses,
  LISTING_DURATION_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PREMIUM_FLAG_OPTIONS,
  RETURN_POLICY_OPTIONS,
  SHIPPING_CLASS_OPTIONS,
  US_STATE_OPTIONS,
  TITLE_COLOR_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  WHO_PAYS_OPTIONS,
} from "@/lib/gunbroker/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ListingPhotos,
  type EditorPicture,
} from "@/components/listing-photos";

function editsFrom(listing: ListingDetail): ListingEdits {
  const usingProfile =
    listing.whoPaysForShipping === 16 && listing.shippingProfileId != null;
  return {
    title: listing.title,
    subtitle: listing.subtitle ?? "",
    description: listing.description ?? "",
    quantity: listing.quantity,
    startingBid: listing.startingBid,
    buyNowPrice: listing.buyNowPrice,
    fixedPrice: listing.fixedPrice,
    sku: listing.sku ?? "",
    upc: listing.upc ?? "",
    reservePrice: listing.reservePrice,
    collectorsElite: listing.collectorsElite ?? false,
    paymentMethods: { ...emptyPaymentMethods(), ...listing.paymentMethods },
    whoPaysForShipping: usingProfile
      ? 16
      : listing.whoPaysForShipping === 16
        ? 4
        : listing.whoPaysForShipping,
    shippingProfileId: listing.shippingProfileId,
    shippingClasses: { ...emptyShippingClasses(), ...listing.shippingClasses },
    shippingClassCosts: { ...emptyShippingClassCosts(), ...listing.shippingClassCosts },
    condition: listing.condition,
    isFflRequired: listing.isFflRequired,
    weight: listing.weight,
    weightUnit: listing.weightUnit ?? 1,
    inspectionPeriod: listing.inspectionPeriod,
    manufacturer: listing.manufacturer ?? "",
    caliber: listing.caliber ?? "",
    rounds: listing.rounds,
    mfgPartNumber: listing.mfgPartNumber ?? "",
    serialNumber: listing.serialNumber ?? "",
    gtin: listing.gtin ?? "",
    excludeStates: [...(listing.excludeStates ?? [])],
    listingDuration: listing.listingDuration,
    autoRelist: listing.autoRelist,
    autoRelistFixedCount: listing.autoRelistFixedCount,
    premiumFeatures: { ...emptyPremiumFeatures(), ...listing.premiumFeatures },
  };
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

function formatDate(value: string | null) {
  if (!value) return "No end date";
  return new Date(value).toLocaleString();
}

function picturesFromListing(listing: ListingDetail): EditorPicture[] {
  const source = listing.pictures.length
    ? listing.pictures
    : listing.thumbnailUrl
      ? [{ url: listing.thumbnailUrl, pictureId: null as string | null }]
      : [];
  return source.map((picture, index) => ({
    key: picture.pictureId ?? `${picture.url}:${index}`,
    url: picture.url,
    pictureId: picture.pictureId,
  }));
}

function revokeLocals(pictures: EditorPicture[]) {
  for (const picture of pictures) {
    if (picture.file && picture.url.startsWith("blob:")) {
      URL.revokeObjectURL(picture.url);
    }
  }
}

export function ListingEditor({ initial }: { initial: ListingDetail }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [edits, setEdits] = useState<ListingEdits>(() => editsFrom(initial));
  const [pictures, setPictures] = useState<EditorPicture[]>(() =>
    picturesFromListing(initial),
  );
  const picturesRef = useRef(pictures);
  picturesRef.current = pictures;
  const [pending, startTransition] = useTransition();
  const [extraFeesOpen, setExtraFeesOpen] = useState(false);

  useEffect(() => {
    return () => revokeLocals(picturesRef.current);
  }, []);

  const removedPictureIds = useMemo(
    () =>
      snapshot.pictures
        .map((picture) => picture.pictureId)
        .filter(
          (id): id is string =>
            Boolean(id) && !pictures.some((picture) => picture.pictureId === id),
        ),
    [pictures, snapshot.pictures],
  );

  const dirty = useMemo(
    () =>
      JSON.stringify(edits) !== JSON.stringify(editsFrom(snapshot)) ||
      removedPictureIds.length > 0 ||
      pictures.some((picture) => picture.file) ||
      pictures.filter((picture) => !picture.file).length !==
        picturesFromListing(snapshot).length,
    [edits, pictures, removedPictureIds.length, snapshot],
  );

  function setField<K extends keyof ListingEdits>(key: K, value: ListingEdits[K]) {
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
    setEdits((current) => {
      const next = new Set(current.excludeStates);
      if (checked) next.add(code);
      else next.delete(code);
      return { ...current, excludeStates: [...next].sort() };
    });
  }

  function setPremiumFlag(key: PremiumFlagKey, value: boolean) {
    setEdits((current) => ({
      ...current,
      premiumFeatures: { ...current.premiumFeatures, [key]: value },
    }));
  }

  function onClose() {
    router.push("/app/inventory");
  }

  function onDiscard() {
    revokeLocals(pictures);
    setEdits(editsFrom(snapshot));
    setPictures(picturesFromListing(snapshot));
  }

  function onCommit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("itemId", snapshot.itemId);
      formData.set("edits", JSON.stringify(edits));
      formData.set("removePictureIds", JSON.stringify(removedPictureIds));
      for (const picture of pictures) {
        if (!picture.file) continue;
        const name = picture.file.name || "photo.jpg";
        formData.append("picture", picture.file, name);
      }
      const result = await commitListingAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      revokeLocals(pictures);
      setSnapshot(result.listing);
      setEdits(editsFrom(result.listing));
      setPictures(picturesFromListing(result.listing));
      toast.success("Changes sent to GunBroker.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Input
            id="listing-title"
            value={edits.title}
            maxLength={75}
            aria-label="Title"
            onChange={(event) => setField("title", event.target.value)}
            className="h-auto border-transparent bg-transparent px-0 text-lg font-medium tracking-tight focus:border-accent/70"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {snapshot.endingAt ? `Ends ${formatDate(snapshot.endingAt)}` : "No end date"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onDiscard}
            disabled={pending || !dirty}
          >
            Discard
          </Button>
          <Button type="button" onClick={onCommit} disabled={pending || !dirty}>
            {pending ? "Sending…" : "Commit"}
          </Button>
        </div>
      </div>

      <form
        className="mt-5 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onCommit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="listing-description">Description</Label>
          <Textarea
            id="listing-description"
            value={edits.description}
            onChange={(event) => setField("description", event.target.value)}
            className="min-h-28"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="listing-qty">Quantity</Label>
            <Input
              id="listing-qty"
              type="number"
              min={1}
              step={1}
              value={edits.quantity}
              onChange={(event) =>
                setField("quantity", Number(event.target.value) || 1)
              }
            />
          </div>
          {snapshot.isFixedPrice ? (
            <div className="space-y-1.5">
              <Label htmlFor="listing-fixed">Price</Label>
              <Input
                id="listing-fixed"
                type="number"
                min={0}
                step="0.01"
                value={edits.fixedPrice ?? ""}
                onChange={(event) => setField("fixedPrice", parseMoney(event.target.value))}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="listing-start">Starting bid</Label>
                <Input
                  id="listing-start"
                  type="number"
                  min={0}
                  step="0.01"
                  value={edits.startingBid ?? ""}
                  onChange={(event) =>
                    setField("startingBid", parseMoney(event.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="listing-buynow">Buy now</Label>
                <Input
                  id="listing-buynow"
                  type="number"
                  min={0}
                  step="0.01"
                  value={edits.buyNowPrice ?? ""}
                  onChange={(event) =>
                    setField("buyNowPrice", parseMoney(event.target.value))
                  }
                />
              </div>
            </>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="listing-condition">Condition</Label>
            <select
              id="listing-condition"
              value={edits.condition ?? ""}
              onChange={(event) =>
                setField(
                  "condition",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30"
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
            <Label htmlFor="listing-weight">Weight</Label>
            <div className="flex gap-2">
              <Input
                id="listing-weight"
                type="number"
                min={0}
                step="0.01"
                value={edits.weight ?? ""}
                onChange={(event) =>
                  setField("weight", parseMoney(event.target.value))
                }
              />
              <select
                id="listing-weight-unit"
                aria-label="Weight unit"
                value={edits.weightUnit ?? 1}
                onChange={(event) =>
                  setField("weightUnit", Number(event.target.value) || 1)
                }
                className="h-10 w-20 shrink-0 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30"
              >
                {WEIGHT_UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-accent"
                checked={edits.isFflRequired}
                onChange={(event) =>
                  setField("isFflRequired", event.target.checked)
                }
              />
              FFL required
            </label>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="listing-manufacturer">Manufacturer</Label>
            <Input
              id="listing-manufacturer"
              value={edits.manufacturer}
              onChange={(event) => setField("manufacturer", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="listing-caliber">Caliber</Label>
            <Input
              id="listing-caliber"
              value={edits.caliber}
              onChange={(event) => setField("caliber", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="listing-rounds">Rounds</Label>
            <Input
              id="listing-rounds"
              type="number"
              min={0}
              step={1}
              value={edits.rounds ?? ""}
              onChange={(event) => {
                const value = event.target.value.trim();
                setField(
                  "rounds",
                  value ? Math.max(1, Math.round(Number(value)) || 1) : null,
                );
              }}
            />
            <p className="text-xs text-muted-foreground">For ammunition.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="listing-sku">SKU</Label>
            <Input
              id="listing-sku"
              value={edits.sku}
              onChange={(event) => setField("sku", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="listing-upc">UPC</Label>
            <Input
              id="listing-upc"
              value={edits.upc}
              onChange={(event) => setField("upc", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="listing-gtin">GTIN</Label>
            <Input
              id="listing-gtin"
              value={edits.gtin}
              onChange={(event) => setField("gtin", event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="listing-mpn">Manufacturer part #</Label>
            <Input
              id="listing-mpn"
              value={edits.mfgPartNumber}
              onChange={(event) => setField("mfgPartNumber", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="listing-serial">Serial number</Label>
            <Input
              id="listing-serial"
              value={edits.serialNumber}
              onChange={(event) => setField("serialNumber", event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Payment</Label>
          <p className="text-xs text-muted-foreground">
            Buyers need at least one option. Clone uses these too.
          </p>
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
          <Label htmlFor="listing-who-pays">Shipping</Label>
          <p className="text-xs text-muted-foreground">
            Clone needs at least one shipping class unless you use a shipping
            profile.
          </p>
          <select
            id="listing-who-pays"
            value={edits.whoPaysForShipping ?? ""}
            onChange={(event) =>
              setField(
                "whoPaysForShipping",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Who pays for shipping</option>
            {WHO_PAYS_OPTIONS.filter(
              (option) => option.value !== 16 || snapshot.shippingProfileId,
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {edits.whoPaysForShipping === 16 && edits.shippingProfileId ? (
            <p className="text-xs text-muted-foreground">
              Uses GunBroker shipping profile {edits.shippingProfileId}. Pick a
              different “who pays” option to set classes here.
            </p>
          ) : (
            <div className="grid gap-2">
              {SHIPPING_CLASS_OPTIONS.map((option) => (
                <div key={option.key} className="flex items-center gap-2 text-sm">
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-accent"
                      checked={edits.shippingClasses[option.key]}
                      onChange={(event) =>
                        setShippingClass(option.key, event.target.checked)
                      }
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
          <Label htmlFor="listing-return-policy">Return policy</Label>
          <select
            id="listing-return-policy"
            value={edits.inspectionPeriod ?? ""}
            onChange={(event) =>
              setField(
                "inspectionPeriod",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30"
          >
            <option value="">No return policy</option>
            {RETURN_POLICY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="listing-duration">Duration</Label>
            <select
              id="listing-duration"
              value={edits.listingDuration ?? ""}
              onChange={(event) =>
                setField(
                  "listingDuration",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Listing duration</option>
              {LISTING_DURATION_OPTIONS.filter(
                (option) =>
                  !option.fixedOnly ||
                  snapshot.isFixedPrice ||
                  edits.listingDuration === option.value,
              ).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="listing-autorelist">Auto-relist</Label>
            <select
              id="listing-autorelist"
              value={edits.autoRelist ?? ""}
              onChange={(event) =>
                setField(
                  "autoRelist",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Auto-relist</option>
              {AUTO_RELIST_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {edits.autoRelist === 3 ? (
            <div className="space-y-1.5">
              <Label htmlFor="listing-autorelist-count">Times to relist</Label>
              <Input
                id="listing-autorelist-count"
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
        <div className="space-y-1.5">
          <Label>Cannot sell to</Label>
          <p className="text-xs text-muted-foreground">
            Checked states cannot buy this listing. Leave all unchecked to use
            your GunBroker default exclusions.
          </p>
          <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
            {US_STATE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-1 text-xs"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border accent-accent"
                  checked={edits.excludeStates.includes(option.value)}
                  onChange={(event) =>
                    setExcludeState(option.value, event.target.checked)
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        <details
          className="group rounded-2xl border border-border bg-card p-4 open:pb-5"
          open={extraFeesOpen}
          onToggle={(event) => {
            setExtraFeesOpen(event.currentTarget.open);
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span>Extra Fees</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            GunBroker bills these when you add or change them. Commit still sends
            the update.
          </p>
          <div className="mt-4 grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="listing-subtitle">Subtitle</Label>
              <Input
                id="listing-subtitle"
                value={edits.subtitle}
                maxLength={50}
                onChange={(event) => setField("subtitle", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Extra search-result line. GunBroker charges a subtitle fee.
              </p>
            </div>
            {snapshot.isFixedPrice ? null : (
              <div className="space-y-1.5">
                <Label htmlFor="listing-reserve">Reserve price</Label>
                <Input
                  id="listing-reserve"
                  type="number"
                  min={0}
                  step="0.01"
                  value={edits.reservePrice ?? ""}
                  onChange={(event) =>
                    setField("reservePrice", parseMoney(event.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Hidden auction minimum. GunBroker charges a reserve fee.
                </p>
              </div>
            )}
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border accent-accent"
                checked={edits.collectorsElite}
                onChange={(event) => setField("collectorsElite", event.target.checked)}
              />
              <span>
                <span className="font-medium">Collector&apos;s Elite</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Premium auction program. Requires GunBroker approval; buyers pay
                  a premium.
                </span>
              </span>
            </label>
            {PREMIUM_FLAG_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border accent-accent"
                  checked={edits.premiumFeatures[option.key]}
                  onChange={(event) =>
                    setPremiumFlag(option.key, event.target.checked)
                  }
                />
                <span>
                  <span className="font-medium">{option.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {option.fee}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
            <div className="space-y-2">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border accent-accent"
                  checked={edits.premiumFeatures.titleColor != null}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      premiumFeatures: {
                        ...current.premiumFeatures,
                        titleColor: event.target.checked ? "Red" : null,
                      },
                    }))
                  }
                />
                <span>
                  <span className="font-medium">Make my listing title colored</span>
                  <span className="ml-2 text-xs text-muted-foreground">+$1.00</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Your listing title is colored on the search results page.
                  </span>
                </span>
              </label>
              {edits.premiumFeatures.titleColor ? (
                <select
                  aria-label="Title color"
                  value={edits.premiumFeatures.titleColor}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      premiumFeatures: {
                        ...current.premiumFeatures,
                        titleColor: event.target.value as TitleColor,
                      },
                    }))
                  }
                  className="ml-7 h-10 w-40 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30"
                >
                  {TITLE_COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border accent-accent"
                  checked={edits.premiumFeatures.isScheduled}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      premiumFeatures: {
                        ...current.premiumFeatures,
                        isScheduled: event.target.checked,
                        scheduledStartingAt: event.target.checked
                          ? current.premiumFeatures.scheduledStartingAt
                          : null,
                      },
                    }))
                  }
                />
                <span>
                  <span className="font-medium">Scheduled Listing</span>
                  <span className="ml-2 text-xs text-muted-foreground">+$1.00</span>
                </span>
              </label>
              {edits.premiumFeatures.isScheduled ? (
                <div className="ml-7 space-y-1.5">
                  <Label htmlFor="listing-scheduled">Start time (Eastern)</Label>
                  <Input
                    id="listing-scheduled"
                    type="datetime-local"
                    value={toDatetimeLocal(edits.premiumFeatures.scheduledStartingAt)}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        premiumFeatures: {
                          ...current.premiumFeatures,
                          scheduledStartingAt: event.target.value
                            ? `${event.target.value}:00`
                            : null,
                        },
                      }))
                    }
                    className="max-w-xs"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </details>
      </form>

      <ListingPhotos
        pictures={pictures}
        disabled={pending}
        onRemove={(key) => {
          setPictures((current) => {
            const next = current.filter((picture) => picture.key !== key);
            const removed = current.find((picture) => picture.key === key);
            if (removed?.file && removed.url.startsWith("blob:")) {
              URL.revokeObjectURL(removed.url);
            }
            return next;
          });
        }}
        onAdd={(files) => {
          setPictures((current) => [
            ...current,
            ...files.map((file) => ({
              key: `local:${crypto.randomUUID()}`,
              url: URL.createObjectURL(file),
              pictureId: null,
              file,
            })),
          ]);
        }}
      />
      <p className="mt-5 text-xs text-muted-foreground">Item {snapshot.itemId}</p>
    </div>
  );
}
