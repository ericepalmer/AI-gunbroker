import { inventoryThumbnailUrl } from "@/lib/inventory-image-url";
import { INVENTORY_THUMB_BOX_CLASS } from "@/lib/inventory-layout";

export function InventoryThumbnail({ url }: { url: string | null }) {
  const src = url ? inventoryThumbnailUrl(url) : null;

  return (
    <div className={INVENTORY_THUMB_BOX_CLASS}>
      {src ? (
        <img
          src={src}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-contain"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
          —
        </span>
      )}
    </div>
  );
}
