import { ComingSoon } from "@/components/coming-soon";

export default function SoldPage() {
  return (
    <ComingSoon
      eyebrow="Sold / ship"
      title="GunBroker sold orders, ready for ShipStation."
      body="When a listing sells, Chamber will create the shipment in ShipStation so buyer, item, and weight are not retyped. This page is the queue."
    />
  );
}
