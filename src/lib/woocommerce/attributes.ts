import { parseCondition } from "@/lib/gunbroker/types";

export type WooAttributeEntry = {
  name: string;
  slug: string | null;
  value: string;
};

export type WooGunBrokerFields = {
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  model: string | null;
  mount: string | null;
  condition: number | null;
  upc: string | null;
  gtin: string | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length ? next : null;
}

export function normalizeAttrName(value: string) {
  return value.toLowerCase().replace(/^pa_/, "").replace(/^_/, "").replace(/[^a-z0-9]/g, "");
}

function firstAttrValue(entry: Record<string, unknown>) {
  const option = asString(entry.option);
  if (option) return option;
  if (Array.isArray(entry.options) && entry.options.length) {
    return entry.options.map((row) => asString(row)).filter(Boolean).join(", ") || null;
  }
  if (typeof entry.value === "string" || typeof entry.value === "number") {
    return asString(entry.value);
  }
  if (Array.isArray(entry.value) && entry.value.length) {
    return entry.value.map((row) => asString(row)).filter(Boolean).join(", ") || null;
  }
  return null;
}

export function collectAttributes(record: Record<string, unknown>): WooAttributeEntry[] {
  const entries: WooAttributeEntry[] = [];
  const seen = new Set<string>();

  const add = (name: string | null, slug: string | null, value: string | null) => {
    if (!name || !value) return;
    const key = normalizeAttrName(slug ?? name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    entries.push({ name, slug, value });
  };

  if (Array.isArray(record.attributes)) {
    for (const raw of record.attributes) {
      const entry = asRecord(raw);
      if (!entry) continue;
      add(
        asString(entry.name) ?? asString(entry.slug),
        asString(entry.slug),
        firstAttrValue(entry),
      );
    }
  }

  const meta = record.meta_data ?? record.metaData;
  if (Array.isArray(meta)) {
    for (const raw of meta) {
      const entry = asRecord(raw);
      if (!entry) continue;
      add(asString(entry.key), null, firstAttrValue(entry));
    }
  }

  const brands = record.brands;
  if (Array.isArray(brands)) {
    for (const raw of brands) {
      const entry = asRecord(raw);
      add("Brand", "brand", asString(entry?.name) ?? asString(raw));
    }
  }

  return entries;
}

export function attributesFromJson(json: string | null | undefined): WooAttributeEntry[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        const entry = asRecord(row);
        if (!entry) return null;
        const name = asString(entry.name);
        const value = asString(entry.value);
        if (!name || !value) return null;
        return {
          name,
          slug: asString(entry.slug),
          value,
        } satisfies WooAttributeEntry;
      })
      .filter((row): row is WooAttributeEntry => Boolean(row));
  } catch {
    return [];
  }
}

export function attributesToJson(entries: WooAttributeEntry[]) {
  return JSON.stringify(entries);
}

function attributeMap(entries: WooAttributeEntry[]) {
  const map = new Map<string, string>();
  for (const entry of entries) {
    for (const raw of [entry.slug, entry.name]) {
      const key = normalizeAttrName(raw ?? "");
      if (!key || map.has(key)) continue;
      map.set(key, entry.value);
    }
  }
  return map;
}

function pickAttr(map: Map<string, string>, ...names: string[]) {
  for (const name of names) {
    const found = map.get(normalizeAttrName(name));
    if (found) return found;
  }
  return null;
}

function pickAttrMatching(map: Map<string, string>, match: (key: string) => boolean) {
  for (const [key, value] of map) {
    if (value && match(key)) return value;
  }
  return null;
}

export function mergeAttributes(
  parent: WooAttributeEntry[],
  child: WooAttributeEntry[],
): WooAttributeEntry[] {
  const map = new Map<string, WooAttributeEntry>();
  for (const entry of [...parent, ...child]) {
    const key = normalizeAttrName(entry.slug ?? entry.name);
    if (!key) continue;
    map.set(key, entry);
  }
  return [...map.values()];
}

export function parseRoundsText(value: string | null) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/(\d+)/);
  if (!match) return null;
  const next = Number(match[1]);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : null;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function roundsFromDescription(description: string | null | undefined) {
  if (!description) return null;
  const text = stripHtml(description);
  const patterns = [
    /\b(\d{1,5})\s*(?:rounds?|rds?|cartridges?|ctgs?|pcs?|pieces?)\b/i,
    /\b(?:rounds?|rds?|cartridges?|ctgs?)\s*(?:per\s*(?:box|order|pack|unit))?\s*[:\-]?\s*(\d{1,5})\b/i,
    /\b(?:count|qty|quantity)\s*[:\-]?\s*(\d{1,5})\s*(?:rounds?|rds?|cartridges?)?\b/i,
    /\b(?:box\s*of|pack\s*of)\s*(\d{1,5})\b/i,
    /\b(\d{1,5})\s*[-–]\s*round\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const next = Number(match[1]);
      if (Number.isFinite(next) && next > 0 && next <= 10_000) return Math.round(next);
    }
  }
  return null;
}

export function gunBrokerFieldsFromAttributes(
  entries: WooAttributeEntry[],
  options?: {
    description?: string | null;
    upc?: string | null;
    globalUniqueId?: string | null;
  },
): WooGunBrokerFields {
  const attrs = attributeMap(entries);
  const upc =
    pickAttr(attrs, "upc", "upccode") ??
    options?.upc ??
    options?.globalUniqueId ??
    null;
  const gtin =
    pickAttr(attrs, "gtin", "ean", "isbn") ?? options?.globalUniqueId ?? upc;
  const roundsFromAttrs = parseRoundsText(
    pickAttr(
      attrs,
      "number",
      "panumber",
      "roundsperbox",
      "roundsperunit",
      "cartridgesperbox",
      "cartridgesperunit",
      "qtyperunit",
      "quantityperunit",
      "countperbox",
      "rounds",
      "roundcount",
      "numberofrounds",
      "numrounds",
      "cartridgecount",
      "cartridgesperorder",
      "numberofcartridgesperorder",
      "roundsperorder",
      "count",
    ) ??
      pickAttrMatching(
        attrs,
        (key) => key === "number" || key === "panumber" || key.endsWith("numberofcartridges"),
      ) ??
      null,
  );
  return {
    manufacturer:
      pickAttr(
        attrs,
        "manufacturer",
        "manufacture",
        "brand",
        "make",
        "mfg",
        "productbrand",
        "productmanufacturer",
      ) ??
      pickAttrMatching(
        attrs,
        (key) =>
          key.startsWith("manufactur") ||
          key.endsWith("manufacturer") ||
          key.endsWith("manufacture") ||
          (key.endsWith("brand") && !key.includes("exclude")),
      ),
    caliber:
      pickAttr(attrs, "caliber", "calibre", "gauge", "productcaliber") ??
      pickAttrMatching(attrs, (key) => key.includes("caliber") || key.includes("calibre") || key === "gauge"),
    rounds: roundsFromAttrs ?? roundsFromDescription(options?.description),
    model:
      pickAttr(attrs, "model", "productmodel", "itemmodel", "modelname", "modelnumber") ??
      pickAttrMatching(
        attrs,
        (key) => key === "model" || key.endsWith("model") || key.startsWith("model"),
      ),
    mount:
      pickAttr(
        attrs,
        "mount",
        "mounting",
        "mountsystem",
        "mountingsystem",
        "thread",
        "threadpitch",
        "threadpattern",
        "directthread",
      ) ??
      pickAttrMatching(
        attrs,
        (key) =>
          key === "mount" ||
          key.includes("mount") ||
          key.includes("threadpitch") ||
          key.includes("threadpattern") ||
          (key.includes("thread") && !key.includes("threaded")),
      ),
    condition: parseCondition(
      pickAttr(
        attrs,
        "condition",
        "factorycondition",
        "itemcondition",
        "productcondition",
        "gbcondition",
      ) ??
        pickAttrMatching(
          attrs,
          (key) => key === "condition" || key.endsWith("condition") || key.includes("factorycondition"),
        ),
    ),
    upc,
    gtin,
    mfgPartNumber: pickAttr(
      attrs,
      "mpn",
      "mfgpartnumber",
      "manufacturerpartnumber",
      "mfgpart",
      "partnumber",
      "partno",
    ),
    serialNumber: pickAttr(attrs, "serial", "serialnumber", "serialno"),
  };
}

export function gunBrokerFieldsFromRecord(record: Record<string, unknown>) {
  const entries = collectAttributes(record);
  return {
    attributes: entries,
    fields: gunBrokerFieldsFromAttributes(entries, {
      description:
        asString(record.description) ??
        asString(record.short_description) ??
        asString(record.shortDescription),
      upc: asString(record.upc),
      globalUniqueId:
        asString(record.global_unique_id) ?? asString(record.globalUniqueId),
    }),
  };
}

export function resolveGunBrokerFields(input: {
  description?: string | null;
  attributesJson?: string | null;
  manufacturer?: string | null;
  caliber?: string | null;
  rounds?: number | null;
  model?: string | null;
  mount?: string | null;
  condition?: number | null;
  upc?: string | null;
  gtin?: string | null;
  mfgPartNumber?: string | null;
  serialNumber?: string | null;
}): WooGunBrokerFields {
  const fromAttrs = gunBrokerFieldsFromAttributes(attributesFromJson(input.attributesJson), {
    description: input.description,
    upc: input.upc,
  });
  return {
    manufacturer: fromAttrs.manufacturer ?? input.manufacturer ?? null,
    caliber: fromAttrs.caliber ?? input.caliber ?? null,
    rounds: fromAttrs.rounds ?? input.rounds ?? roundsFromDescription(input.description),
    model: fromAttrs.model ?? input.model ?? null,
    mount: fromAttrs.mount ?? input.mount ?? null,
    condition: fromAttrs.condition ?? input.condition ?? null,
    upc: fromAttrs.upc ?? input.upc ?? null,
    gtin: fromAttrs.gtin ?? input.gtin ?? null,
    mfgPartNumber: fromAttrs.mfgPartNumber ?? input.mfgPartNumber ?? null,
    serialNumber: fromAttrs.serialNumber ?? input.serialNumber ?? null,
  };
}

export function isManufacturerValidationError(message: string) {
  return /manufacturer/i.test(message) && /invalid|not valid|unknown|does not exist|not found|not allowed|unrecognized|must be/i.test(message);
}
