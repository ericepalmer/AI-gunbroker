import { ListingEditor } from "@/components/listing-editor";
import { getListingDetail } from "@/lib/gunbroker/listings";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await getSession();
  const { itemId } = await params;
  const listing = await getListingDetail(session!.user.id, itemId);
  if (!listing) notFound();
  return <ListingEditor initial={listing} />;
}
