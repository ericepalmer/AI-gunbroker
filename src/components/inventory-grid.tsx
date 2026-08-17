import type { ListingCard } from "@/lib/gunbroker/types";
import { InventoryCard } from "@/components/inventory-card";

export function InventoryGrid({ listings }: { listings: ListingCard[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No listings yet. Import from GunBroker to load your active items.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <InventoryCard key={listing.itemId} listing={listing} />
      ))}
    </div>
  );
}
