import { WooProductDetailView } from "@/components/woo-product-detail-view";
import { getWooProductDetail } from "@/lib/woocommerce/service";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function WooProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const session = await getSession();
  const { productId } = await params;
  const id = Number(productId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const product = await getWooProductDetail(session!.user.id, id);
  if (!product) notFound();

  return <WooProductDetailView product={product} />;
}
