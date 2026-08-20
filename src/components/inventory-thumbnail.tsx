import { inventoryThumbnailUrl } from "@/lib/inventory-image-url";
import { INVENTORY_THUMB_BOX_CLASS } from "@/lib/inventory-layout";

export function InventoryThumbnail({
  url,
  size = "md",
}: {
  url: string | null;
  size?: "sm" | "md";
}) {
  const src = url ? inventoryThumbnailUrl(url) : null;
  const boxClass =
    size === "sm"
      ? "relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
      : INVENTORY_THUMB_BOX_CLASS;

  return (
    <div className={boxClass}>
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
