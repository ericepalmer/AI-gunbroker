import type { WooProductCard } from "@/lib/woocommerce/types";
import { Badge } from "@/components/ui/badge";

function money(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function stockTone(status: string) {
  if (status === "instock") return "success" as const;
  if (status === "onbackorder") return "warning" as const;
  return "danger" as const;
}

function stockLabel(status: string, quantity: number | null) {
  if (status === "instock") {
    return quantity == null ? "In stock" : `${quantity} in stock`;
  }
  if (status === "onbackorder") return "Backorder";
  return "Out of stock";
}

export function StoreGrid({ products }: { products: WooProductCard[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No store products yet. Import from WooCommerce to load items for sale.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article
          key={product.productId}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          {product.thumbnailUrl ? (
            // Store CDNs vary by merchant; keep this a plain img.
            <img
              src={product.thumbnailUrl}
              alt=""
              className="h-40 w-full object-cover"
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-muted text-xs text-muted-foreground">
              No image
            </div>
          )}
          <div className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={stockTone(product.stockStatus)}>
                {stockLabel(product.stockStatus, product.stockQuantity)}
              </Badge>
              {product.type === "variation" ? <Badge>Variation</Badge> : null}
            </div>
            <h2 className="font-serif text-lg leading-snug tracking-tight">{product.name}</h2>
            <p className="text-sm text-muted-foreground">
              {product.sku ? `SKU ${product.sku}` : "No SKU"}
              {product.categories.length ? ` · ${product.categories.join(", ")}` : ""}
            </p>
            <p className="text-sm">{money(product.price)}</p>
            {product.permalink ? (
              <a
                href={product.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-accent underline-offset-4 hover:underline"
              >
                View on store
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
