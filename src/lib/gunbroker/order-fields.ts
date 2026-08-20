import { asEnumName, asString, pickField } from "@/lib/gunbroker/types";

const SHIP_CLASS_LABELS: Record<number, string> = {
  0: "None",
  1: "Overnight",
  2: "2-Day",
  4: "3-Day",
  8: "Ground",
  16: "USPS First Class",
  32: "USPS Priority Mail",
  64: "Other",
  128: "In-Store Pickup",
  256: "Alaska, Hawaii & Territories",
};

export function gunBrokerKeyPairLabel(value: unknown) {
  if (value == null) return null;

  const direct = asString(value);
  if (direct && direct !== "[object Object]") return direct;

  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const nested of Object.values(record)) {
      const name = asEnumName(nested) ?? asString(nested);
      if (name && !/^\d+$/.test(name)) return name;
    }
    for (const key of Object.keys(record)) {
      if (/^\d+$/.test(key)) {
        const mapped = SHIP_CLASS_LABELS[Number(key)];
        if (mapped) return mapped;
      }
    }
  }

  const enumName = asEnumName(value);
  if (enumName && !/^\d+$/.test(enumName)) return enumName;

  const enumId = Number(asString(value));
  if (Number.isFinite(enumId) && SHIP_CLASS_LABELS[enumId]) {
    return SHIP_CLASS_LABELS[enumId]!;
  }

  return null;
}

export function gunBrokerEmailFrom(
  order: unknown,
  buyerEmail: string | null,
) {
  return (
    asString(pickField(order, "shipToEmail", "ShipToEmail")) ??
    asString(pickField(order, "billToEmail", "BillToEmail")) ??
    buyerEmail ??
    asString(
      pickField(
        order,
        "buyerEmail",
        "BuyerEmail",
        "contactEmail",
        "ContactEmail",
        "email",
        "Email",
      ),
    )
  );
}
