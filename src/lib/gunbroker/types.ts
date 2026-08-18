export type GunBrokerEnvironment = "sandbox" | "production";

export type GunBrokerSecrets = {
  password: string;
  accessToken?: string;
};

export type GunBrokerAccount = {
  userId: string | null;
  userName: string | null;
  displayName: string | null;
};

export type GunBrokerStatus = {
  status: "disconnected" | "connected" | "error";
  environment: GunBrokerEnvironment;
  username: string | null;
  hasPassword: boolean;
  externalUserId: string | null;
  externalUsername: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
  devKeyConfigured: boolean;
  apiReachable: boolean | null;
  apiError: string | null;
};

export class GunBrokerApiError extends Error {
  status: number;
  userMessage: string;
  developerMessage: string | null;

  constructor(status: number, userMessage: string, developerMessage?: string | null) {
    super(userMessage);
    this.name = "GunBrokerApiError";
    this.status = status;
    this.userMessage = userMessage;
    this.developerMessage = developerMessage ?? null;
  }
}

export function pickField(payload: unknown, ...names: string[]) {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  for (const name of names) {
    if (record[name] != null) return record[name];
  }
  const wanted = names.map((name) => name.toLowerCase());
  for (const [key, value] of Object.entries(record)) {
    if (wanted.includes(key.toLowerCase()) && value != null) return value;
  }
  return undefined;
}

export function asString(value: unknown) {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length ? next : null;
}

export function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const next = value.trim().toLowerCase();
    if (next === "true" || next === "1") return true;
    if (next === "false" || next === "0") return false;
  }
  return null;
}

export function asNumber(value: unknown) {
  if (value == null || value === "") return null;
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : null;
}

export function asEnumId(value: unknown): number | null {
  const direct = asNumber(value);
  if (direct != null) return direct;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["value", "Value", "id", "ID", "key", "Key", "enumValue", "EnumValue"]) {
    const next = asNumber(record[key]);
    if (next != null) return next;
  }
  for (const key of Object.keys(record)) {
    if (/^\d+$/.test(key)) return Number(key);
  }
  for (const nested of Object.values(record)) {
    const next = asEnumId(nested);
    if (next != null) return next;
  }
  return null;
}

export function asEnumName(value: unknown): string | null {
  if (typeof value === "string") return asString(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const name = asEnumName(entry);
      if (name) return name;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["name", "Name", "label", "Label", "text", "Text", "value", "Value"]) {
    const name = asString(record[key]);
    if (name && !/^\d+$/.test(name)) return name;
  }
  for (const nested of Object.values(record)) {
    if (typeof nested !== "string") continue;
    const name = asString(nested);
    if (name && !/^\d+$/.test(name)) return name;
  }
  return null;
}

export function asMoney(value: unknown) {
  const next = asNumber(value);
  if (next == null || next <= 0) return null;
  return next;
}

export function asDate(value: unknown) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? null : next;
  }
  const raw = String(value);
  const ms = raw.match(/\/Date\((-?\d+)\)\//);
  const next = new Date(ms ? Number(ms[1]) : raw);
  return Number.isNaN(next.getTime()) ? null : next;
}

export function asList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const results = pickField(payload, "results", "Results", "items", "Items");
  return Array.isArray(results) ? results : [];
}

export function asCount(payload: unknown, fallback = 0) {
  return asNumber(pickField(payload, "count", "Count")) ?? fallback;
}

export type ListingPicture = {
  url: string;
  pictureId: string | null;
  displayOrder: number | null;
};

export type ListingCard = {
  itemId: string;
  title: string;
  thumbnailUrl: string | null;
  endingAt: string | null;
  quantity: number;
  price: number | null;
  isFixedPrice: boolean;
  subtitle: string | null;
  reservePrice: number | null;
  listingDuration: number | null;
  premiumFeatures: PremiumFeatures;
};

export type ListingDetail = ListingCard & {
  subtitle: string | null;
  description: string | null;
  pictures: ListingPicture[];
  startingBid: number | null;
  buyNowPrice: number | null;
  fixedPrice: number | null;
  sku: string | null;
  upc: string | null;
  reservePrice: number | null;
  collectorsElite: boolean;
  paymentMethods: PaymentMethods;
  whoPaysForShipping: number | null;
  shippingProfileId: number | null;
  shippingClasses: ShippingClasses;
  shippingClassCosts: ShippingClassCosts;
  condition: number | null;
  isFflRequired: boolean;
  weight: number | null;
  weightUnit: number | null;
  inspectionPeriod: number | null;
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
  gtin: string | null;
  excludeStates: string[];
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
  premiumFeatures: PremiumFeatures;
  lastImportedAt: string | null;
};

export const PAYMENT_METHOD_KEYS = [
  "VisaMastercard",
  "Amex",
  "Discover",
  "PayPal",
  "Check",
  "CertifiedCheck",
  "MoneyOrder",
  "USPSMoneyOrder",
  "COD",
  "Escrow",
  "Financing",
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

export type PaymentMethods = Record<PaymentMethodKey, boolean>;

export const PAYMENT_METHOD_OPTIONS: { key: PaymentMethodKey; label: string }[] = [
  { key: "VisaMastercard", label: "Visa / Mastercard" },
  { key: "Amex", label: "American Express" },
  { key: "Discover", label: "Discover" },
  { key: "PayPal", label: "PayPal" },
  { key: "Check", label: "Personal check" },
  { key: "CertifiedCheck", label: "Certified check" },
  { key: "MoneyOrder", label: "Money order" },
  { key: "USPSMoneyOrder", label: "USPS money order" },
  { key: "COD", label: "COD" },
  { key: "Escrow", label: "GunTab / Escrow" },
  { key: "Financing", label: "Financing" },
];

const GET_PAYMENT_FLAG_TO_KEY: Record<number, PaymentMethodKey> = {
  2: "CertifiedCheck",
  4: "Check",
  8: "VisaMastercard",
  16: "COD",
  32: "Escrow",
  64: "Amex",
  128: "Discover",
  512: "PayPal",
  8192: "CertifiedCheck",
  16384: "USPSMoneyOrder",
  32768: "MoneyOrder",
};

const PAYMENT_NAME_TO_KEY: Record<string, PaymentMethodKey> = {
  visamastercard: "VisaMastercard",
  visa: "VisaMastercard",
  mastercard: "VisaMastercard",
  amex: "Amex",
  americanexpress: "Amex",
  discover: "Discover",
  paypal: "PayPal",
  check: "Check",
  personalcheck: "Check",
  certifiedcheck: "CertifiedCheck",
  certifiedfunds: "CertifiedCheck",
  moneyorder: "MoneyOrder",
  uspsmoneyorder: "USPSMoneyOrder",
  cod: "COD",
  escrow: "Escrow",
  guntab: "Escrow",
  guntabccach: "Escrow",
  financing: "Financing",
};

export function emptyPaymentMethods(): PaymentMethods {
  return {
    VisaMastercard: false,
    Amex: false,
    Discover: false,
    PayPal: false,
    Check: false,
    CertifiedCheck: false,
    MoneyOrder: false,
    USPSMoneyOrder: false,
    COD: false,
    Escrow: false,
    Financing: false,
  };
}

export function hasAnyPaymentMethod(methods: PaymentMethods) {
  return PAYMENT_METHOD_KEYS.some((key) => methods[key]);
}

function applyPaymentFlag(target: PaymentMethods, flag: number) {
  const key = GET_PAYMENT_FLAG_TO_KEY[flag];
  if (key) target[key] = true;
}

function applyPaymentName(target: PaymentMethods, name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = PAYMENT_NAME_TO_KEY[normalized];
  if (key) target[key] = true;
}

function applyPaymentFlags(target: PaymentMethods, flags: number) {
  for (const flag of Object.keys(GET_PAYMENT_FLAG_TO_KEY).map(Number)) {
    if (flags & flag) applyPaymentFlag(target, flag);
  }
}

function recordKey(record: Record<string, unknown>, name: string) {
  if (record[name] != null) return record[name];
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
}

export function parsePaymentMethods(value: unknown): PaymentMethods {
  const next = emptyPaymentMethods();
  if (value == null || value === "") return next;

  if (typeof value === "string") {
    try {
      return parsePaymentMethods(JSON.parse(value));
    } catch {
      return next;
    }
  }

  if (typeof value === "number") {
    applyPaymentFlags(next, value);
    return next;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "number") {
        applyPaymentFlag(next, entry);
        applyPaymentFlags(next, entry);
        continue;
      }
      if (typeof entry === "string") {
        if (/^\d+$/.test(entry)) applyPaymentFlag(next, Number(entry));
        else applyPaymentName(next, entry);
        continue;
      }
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const id =
          asEnumId(entry) ??
          asNumber(pickField(entry, "key", "Key", "id", "ID", "value", "Value"));
        if (id != null) applyPaymentFlag(next, id);
        for (const [key, nested] of Object.entries(record)) {
          if (/^\d+$/.test(key)) applyPaymentFlag(next, Number(key));
          if (typeof nested === "string") applyPaymentName(next, nested);
        }
      }
    }
    return next;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of PAYMENT_METHOD_KEYS) {
      const flag = asBoolean(recordKey(record, key));
      if (flag != null) next[key] = flag;
    }
    for (const key of Object.keys(record)) {
      if (/^\d+$/.test(key)) applyPaymentFlag(next, Number(key));
    }
    return next;
  }

  return next;
}

export function paymentMethodsForApi(methods: PaymentMethods) {
  return {
    Check: methods.Check,
    VisaMastercard: methods.VisaMastercard,
    COD: methods.COD,
    Escrow: methods.Escrow,
    Amex: methods.Amex,
    PayPal: methods.PayPal,
    Discover: methods.Discover,
    SeeItemDesc: false,
    CertifiedCheck: methods.CertifiedCheck,
    USPSMoneyOrder: methods.USPSMoneyOrder,
    MoneyOrder: methods.MoneyOrder,
    FreedomCoin: false,
    Financing: methods.Financing,
  };
}

export function paymentMethodsEqual(left: PaymentMethods, right: PaymentMethods) {
  return PAYMENT_METHOD_KEYS.every((key) => left[key] === right[key]);
}

export const SHIPPING_CLASS_KEYS = [
  "Overnight",
  "TwoDay",
  "ThreeDay",
  "Ground",
  "FirstClass",
  "Priority",
  "InStorePickup",
  "AlaskaHawaii",
  "Other",
] as const;

export type ShippingClassKey = (typeof SHIPPING_CLASS_KEYS)[number];
export type ShippingClasses = Record<ShippingClassKey, boolean>;
export type ShippingClassCosts = Record<ShippingClassKey, number | null>;

export const SHIPPING_CLASS_OPTIONS: { key: ShippingClassKey; label: string }[] = [
  { key: "Overnight", label: "Overnight" },
  { key: "TwoDay", label: "2nd day" },
  { key: "ThreeDay", label: "3rd day" },
  { key: "Ground", label: "Ground" },
  { key: "FirstClass", label: "USPS First Class" },
  { key: "Priority", label: "USPS Priority" },
  { key: "InStorePickup", label: "In-store pickup" },
  { key: "AlaskaHawaii", label: "Alaska / Hawaii" },
  { key: "Other", label: "Other" },
];

export const WHO_PAYS_OPTIONS = [
  { value: 2, label: "Seller pays" },
  { value: 4, label: "Buyer pays actual shipping" },
  { value: 8, label: "Buyer pays a fixed amount" },
  { value: 16, label: "Use shipping profile" },
] as const;

const GET_SHIPPING_FLAG_TO_KEY: Record<number, ShippingClassKey> = {
  1: "Overnight",
  2: "TwoDay",
  4: "ThreeDay",
  8: "Ground",
  16: "FirstClass",
  32: "Priority",
  64: "Other",
  125: "InStorePickup",
  128: "InStorePickup",
  256: "AlaskaHawaii",
};

const SHIPPING_NAME_TO_KEY: Record<string, ShippingClassKey> = {
  overnight: "Overnight",
  twoday: "TwoDay",
  secondday: "TwoDay",
  "2ndday": "TwoDay",
  threeday: "ThreeDay",
  thirdday: "ThreeDay",
  "3rdday": "ThreeDay",
  ground: "Ground",
  firstclass: "FirstClass",
  usps1stclass: "FirstClass",
  uspsfirstclass: "FirstClass",
  priority: "Priority",
  uspspriority: "Priority",
  uspsprioritymail: "Priority",
  instorepickup: "InStorePickup",
  pickup: "InStorePickup",
  alaskahawaii: "AlaskaHawaii",
  other: "Other",
};

export function emptyShippingClasses(): ShippingClasses {
  return {
    Overnight: false,
    TwoDay: false,
    ThreeDay: false,
    Ground: false,
    FirstClass: false,
    Priority: false,
    InStorePickup: false,
    AlaskaHawaii: false,
    Other: false,
  };
}

export function emptyShippingClassCosts(): ShippingClassCosts {
  return {
    Overnight: null,
    TwoDay: null,
    ThreeDay: null,
    Ground: null,
    FirstClass: null,
    Priority: null,
    InStorePickup: null,
    AlaskaHawaii: null,
    Other: null,
  };
}

export function hasAnyShippingClass(classes: ShippingClasses) {
  return SHIPPING_CLASS_KEYS.some((key) => classes[key]);
}

function applyShippingFlag(target: ShippingClasses, flag: number) {
  const key = GET_SHIPPING_FLAG_TO_KEY[flag];
  if (key) target[key] = true;
}

function applyShippingName(target: ShippingClasses, name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = SHIPPING_NAME_TO_KEY[normalized];
  if (key) target[key] = true;
}

export function parseShippingClasses(value: unknown): ShippingClasses {
  const next = emptyShippingClasses();
  if (value == null || value === "") return next;

  if (typeof value === "string") {
    try {
      return parseShippingClasses(JSON.parse(value));
    } catch {
      return next;
    }
  }

  if (typeof value === "number") {
    for (const flag of Object.keys(GET_SHIPPING_FLAG_TO_KEY).map(Number)) {
      if (value & flag) applyShippingFlag(next, flag);
    }
    applyShippingFlag(next, value);
    return next;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "number") {
        applyShippingFlag(next, entry);
        continue;
      }
      if (typeof entry === "string") {
        if (/^\d+$/.test(entry)) applyShippingFlag(next, Number(entry));
        else applyShippingName(next, entry);
        continue;
      }
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const id =
          asEnumId(entry) ??
          asNumber(pickField(entry, "key", "Key", "id", "ID", "value", "Value"));
        if (id != null) applyShippingFlag(next, id);
        for (const [key, nested] of Object.entries(record)) {
          if (/^\d+$/.test(key)) applyShippingFlag(next, Number(key));
          if (typeof nested === "string") applyShippingName(next, nested);
        }
      }
    }
    return next;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of SHIPPING_CLASS_KEYS) {
      const flag = asBoolean(recordKey(record, key));
      if (flag != null) next[key] = flag;
    }
    for (const key of Object.keys(record)) {
      if (/^\d+$/.test(key)) applyShippingFlag(next, Number(key));
    }
    return next;
  }

  return next;
}

function shippingKeyFromFlagOrName(raw: string): ShippingClassKey | null {
  if (/^\d+$/.test(raw)) return GET_SHIPPING_FLAG_TO_KEY[Number(raw)] ?? null;
  return SHIPPING_NAME_TO_KEY[raw.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
}

export function parseShippingClassCosts(value: unknown): ShippingClassCosts {
  const next = emptyShippingClassCosts();
  if (value == null || value === "") return next;

  if (typeof value === "string") {
    try {
      return parseShippingClassCosts(JSON.parse(value));
    } catch {
      return next;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const flagged =
        asEnumId(entry) ?? asNumber(pickField(entry, "key", "Key", "id", "ID"));
      const amount =
        asNumber(pickField(entry, "value", "Value", "cost", "Cost", "amount", "Amount")) ??
        (flagged == null
          ? null
          : asNumber(
              Object.entries(record).find(([key]) => /^\d+$/.test(key))?.[1],
            ));
      const fromFlag = flagged != null ? GET_SHIPPING_FLAG_TO_KEY[flagged] : null;
      if (fromFlag && amount != null) next[fromFlag] = amount;
      for (const [key, nested] of Object.entries(record)) {
        const mapped = shippingKeyFromFlagOrName(key);
        const nestedAmount = asNumber(nested);
        if (mapped && nestedAmount != null) next[mapped] = nestedAmount;
      }
    }
    return next;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of SHIPPING_CLASS_KEYS) {
      const amount = asNumber(recordKey(record, key));
      if (amount != null) next[key] = amount;
    }
    for (const [key, nested] of Object.entries(record)) {
      const mapped = shippingKeyFromFlagOrName(key);
      const amount = asNumber(nested);
      if (mapped && amount != null) next[mapped] = amount;
    }
  }

  return next;
}

export function parseWhoPaysForShipping(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseWhoPaysForShipping(entry);
      if (parsed != null) return parsed;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (/^\d+$/.test(key)) {
        const parsed = parseWhoPaysForShipping(Number(key));
        if (parsed != null) return parsed;
      }
    }
  }
  const id = asEnumId(value) ?? asNumber(value);
  if (id == null) return null;
  const cleaned = id & ~1;
  if (cleaned === 2 || cleaned === 4 || cleaned === 8 || cleaned === 16) return cleaned;
  if (cleaned & 8) return 8;
  if (cleaned & 4) return 4;
  if (cleaned & 2) return 2;
  if (cleaned === 16 || cleaned & 16) return 16;
  return null;
}

export function parseShippingProfileId(value: unknown): number | null {
  const id = asEnumId(value) ?? asNumber(value);
  if (id == null || id <= 0) return null;
  return id;
}

export function shippingClassesForApi(classes: ShippingClasses) {
  return { ...classes };
}

export function shippingClassCostsForApi(
  classes: ShippingClasses,
  costs: ShippingClassCosts,
) {
  const next: Record<string, number> = {};
  for (const key of SHIPPING_CLASS_KEYS) {
    if (!classes[key]) continue;
    next[key] = costs[key] ?? 0;
  }
  return next;
}

export function shippingClassesEqual(left: ShippingClasses, right: ShippingClasses) {
  return SHIPPING_CLASS_KEYS.every((key) => left[key] === right[key]);
}

export function shippingClassCostsEqual(
  left: ShippingClassCosts,
  right: ShippingClassCosts,
) {
  return SHIPPING_CLASS_KEYS.every((key) => {
    const a = left[key];
    const b = right[key];
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return Math.abs(a - b) < 0.001;
  });
}

export const CONDITION_OPTIONS = [
  { value: 1, label: "New" },
  { value: 2, label: "New old stock" },
  { value: 3, label: "Used" },
  { value: 4, label: "Reloaded" },
] as const;

export const WEIGHT_UNIT_OPTIONS = [
  { value: 1, label: "lb" },
  { value: 2, label: "kg" },
] as const;

export function parseCondition(value: unknown): number | null {
  const texts: string[] = [];
  if (typeof value === "string") texts.push(value);
  else if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseCondition(entry);
      if (parsed != null) return parsed;
    }
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (typeof nested === "string") texts.push(nested);
    }
  }
  for (const text of texts) {
    const normalized = text.toLowerCase().replace(/[^a-z]/g, "");
    if (normalized.includes("reload")) return 4;
    if (normalized.includes("oldstock") || normalized === "nos") return 2;
    if (normalized.includes("used")) return 3;
    if (normalized.includes("factory") || normalized.includes("new")) return 1;
  }
  const id = asEnumId(value);
  if (id === 1 || id === 2 || id === 3 || id === 4) return id;
  return null;
}

export function parseWeightUnit(value: unknown): number | null {
  const id = asEnumId(value);
  if (id === 1 || id === 2) return id;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized.startsWith("kg") || normalized.includes("kilo")) return 2;
    if (normalized.startsWith("lb") || normalized.includes("pound")) return 1;
  }
  return null;
}

export const RETURN_POLICY_OPTIONS = [
  { value: 1, label: "AS IS — no refund or exchange" },
  { value: 2, label: "Exchange or store credit, 14 days" },
  { value: 3, label: "Exchange or store credit, 30 days" },
  { value: 4, label: "3 days from receipt" },
  { value: 5, label: "3 days from receipt, shipping included" },
  { value: 6, label: "5 days from receipt" },
  { value: 7, label: "5 days from receipt, shipping included" },
  { value: 8, label: "7 days from receipt" },
  { value: 9, label: "7 days from receipt, shipping included" },
  { value: 10, label: "14 days from receipt" },
  { value: 11, label: "14 days from receipt, shipping included" },
  { value: 12, label: "30-day money back" },
  { value: 13, label: "30-day money back, shipping included" },
  { value: 14, label: "Factory warranty" },
] as const;

export function parseInspectionPeriod(value: unknown): number | null {
  const id = asEnumId(value);
  if (id != null && id >= 1 && id <= 14) return id;
  return null;
}

export const LISTING_DURATION_OPTIONS = [
  { value: 1, label: "1 day", fixedOnly: false },
  { value: 3, label: "3 days", fixedOnly: false },
  { value: 4, label: "4 days", fixedOnly: false },
  { value: 5, label: "5 days", fixedOnly: false },
  { value: 6, label: "6 days", fixedOnly: false },
  { value: 7, label: "7 days", fixedOnly: false },
  { value: 8, label: "8 days", fixedOnly: false },
  { value: 9, label: "9 days", fixedOnly: false },
  { value: 10, label: "10 days", fixedOnly: false },
  { value: 11, label: "11 days", fixedOnly: false },
  { value: 12, label: "12 days", fixedOnly: false },
  { value: 13, label: "13 days", fixedOnly: false },
  { value: 14, label: "14 days", fixedOnly: false },
  { value: 30, label: "30 days", fixedOnly: true },
  { value: 60, label: "60 days", fixedOnly: true },
  { value: 90, label: "90 days", fixedOnly: true },
] as const;

export const AUTO_RELIST_OPTIONS = [
  { value: 1, label: "Do not relist" },
  { value: 2, label: "Relist until sold" },
  { value: 3, label: "Relist a set number of times" },
  { value: 4, label: "Relist as fixed price" },
] as const;

export const US_STATE_OPTIONS = [
  { value: "AL", label: "AL" },
  { value: "AK", label: "AK" },
  { value: "AZ", label: "AZ" },
  { value: "AR", label: "AR" },
  { value: "CA", label: "CA" },
  { value: "CO", label: "CO" },
  { value: "CT", label: "CT" },
  { value: "DC", label: "DC" },
  { value: "DE", label: "DE" },
  { value: "FL", label: "FL" },
  { value: "GA", label: "GA" },
  { value: "HI", label: "HI" },
  { value: "ID", label: "ID" },
  { value: "IL", label: "IL" },
  { value: "IN", label: "IN" },
  { value: "IA", label: "IA" },
  { value: "KS", label: "KS" },
  { value: "KY", label: "KY" },
  { value: "LA", label: "LA" },
  { value: "ME", label: "ME" },
  { value: "MD", label: "MD" },
  { value: "MA", label: "MA" },
  { value: "MI", label: "MI" },
  { value: "MN", label: "MN" },
  { value: "MS", label: "MS" },
  { value: "MO", label: "MO" },
  { value: "MT", label: "MT" },
  { value: "NE", label: "NE" },
  { value: "NV", label: "NV" },
  { value: "NH", label: "NH" },
  { value: "NJ", label: "NJ" },
  { value: "NM", label: "NM" },
  { value: "NY", label: "NY" },
  { value: "NC", label: "NC" },
  { value: "ND", label: "ND" },
  { value: "OH", label: "OH" },
  { value: "OK", label: "OK" },
  { value: "OR", label: "OR" },
  { value: "PA", label: "PA" },
  { value: "RI", label: "RI" },
  { value: "SC", label: "SC" },
  { value: "SD", label: "SD" },
  { value: "TN", label: "TN" },
  { value: "TX", label: "TX" },
  { value: "UT", label: "UT" },
  { value: "VT", label: "VT" },
  { value: "VA", label: "VA" },
  { value: "WA", label: "WA" },
  { value: "WV", label: "WV" },
  { value: "WI", label: "WI" },
  { value: "WY", label: "WY" },
] as const;

const US_STATE_SET = new Set<string>(US_STATE_OPTIONS.map((option) => option.value));

export function parseListingDuration(value: unknown): number | null {
  const id = asEnumId(value);
  if (id == null) return null;
  return LISTING_DURATION_OPTIONS.some((option) => option.value === id) ? id : null;
}

export function parseAutoRelist(value: unknown): number | null {
  const id = asEnumId(value);
  if (id == null) return null;
  if (id >= 1 && id <= 4) return id;
  if (id === 32000 || id === 35000) return 2;
  if (id > 4 && id <= 999) return 3;
  return null;
}

export function parseAutoRelistFixedCount(value: unknown, autoRelist: number | null) {
  const count = asNumber(value);
  if (count != null && count > 0) return Math.round(count);
  const raw = asEnumId(value);
  if (autoRelist === 3 && raw != null && raw > 4 && raw <= 999) return raw;
  return null;
}

export function parseRounds(value: unknown) {
  const next = asNumber(value);
  if (next == null || next <= 0) return null;
  return Math.round(next);
}

export function characteristicValue(source: unknown, ...names: string[]) {
  const wanted = names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const visit = (value: unknown): unknown => {
    if (value == null) return undefined;
    const direct = pickField(value, ...names);
    if (direct != null) return direct;
    const nested = pickField(
      value,
      "characteristics",
      "Characteristics",
      "itemAttributes",
      "ItemAttributes",
      "attributes",
      "Attributes",
    );
    if (Array.isArray(nested)) {
      for (const entry of nested) {
        if (!entry || typeof entry !== "object") continue;
        const name = asString(
          pickField(entry, "name", "Name", "attributeName", "AttributeName", "key", "Key"),
        );
        const normalized = name?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
        if (wanted.includes(normalized)) {
          return pickField(entry, "value", "Value", "attributeValue", "AttributeValue");
        }
      }
      return undefined;
    }
    if (nested && typeof nested === "object") return pickField(nested, ...names);
    return undefined;
  };
  return visit(source);
}

export function parseExcludeStates(value: unknown): string[] {
  const codes: string[] = [];
  const add = (entry: unknown) => {
    if (typeof entry === "string") {
      for (const part of entry.split(/[\s,;]+/)) {
        const code = part.trim().toUpperCase();
        if (US_STATE_SET.has(code) && !codes.includes(code)) codes.push(code);
      }
      return;
    }
    if (Array.isArray(entry)) {
      for (const nested of entry) add(nested);
      return;
    }
    const name = asEnumName(entry) ?? asString(asEnumId(entry));
    if (name) add(name);
  };
  add(value);
  return codes.sort();
}

export function excludeStatesText(states: string[]) {
  return [...new Set(states.map((state) => state.toUpperCase()).filter((state) => US_STATE_SET.has(state)))]
    .sort()
    .join(",");
}

export function excludeStatesEqual(left: string[], right: string[]) {
  return excludeStatesText(left) === excludeStatesText(right);
}

export const TITLE_COLOR_OPTIONS = [
  { value: "Red", label: "Red" },
  { value: "Green", label: "Green" },
  { value: "Blue", label: "Blue" },
] as const;

export type TitleColor = (typeof TITLE_COLOR_OPTIONS)[number]["value"];

export type PremiumFeatures = {
  isShowcase: boolean;
  isFeatured: boolean;
  isSponsoredOnsite: boolean;
  isSponsoredOffsite: boolean;
  isHighlighted: boolean;
  isTitleBoldface: boolean;
  titleColor: TitleColor | null;
  hasViewCounter: boolean;
  isScheduled: boolean;
  scheduledStartingAt: string | null;
};

export const PREMIUM_FLAG_OPTIONS = [
  {
    key: "isShowcase",
    label: "Showcase my listing",
    fee: "+$4.95",
    description: "Your listing is shown on the homepage.",
  },
  {
    key: "isFeatured",
    label: "Feature my listing",
    fee: "+$2.95",
    description:
      "Your listing is shown before non-featured items on the search results page.",
  },
  {
    key: "isSponsoredOnsite",
    label: "Sponsor my listing on-site",
    fee: "+$4.00",
    description: "Your listing is given additional exposure on GunBroker.com.",
  },
  {
    key: "isSponsoredOffsite",
    label: "Sponsor my listing off-site",
    fee: "+$7.00",
    description: "Your listing is given additional exposure on other web sites.",
  },
  {
    key: "isHighlighted",
    label: "Highlight my listing",
    fee: "+$2.00",
    description: "Your listing has a highlighted edge on the search results page.",
  },
  {
    key: "isTitleBoldface",
    label: "Make my listing title boldfaced",
    fee: "+$1.00",
    description: "Your listing title is boldfaced on the search results page.",
  },
  {
    key: "hasViewCounter",
    label: "Show me a view counter",
    fee: "+$0.50",
    description: "See how many times your listing has been viewed.",
  },
] as const;

export type PremiumFlagKey = (typeof PREMIUM_FLAG_OPTIONS)[number]["key"];

export function emptyPremiumFeatures(): PremiumFeatures {
  return {
    isShowcase: false,
    isFeatured: false,
    isSponsoredOnsite: false,
    isSponsoredOffsite: false,
    isHighlighted: false,
    isTitleBoldface: false,
    titleColor: null,
    hasViewCounter: false,
    isScheduled: false,
    scheduledStartingAt: null,
  };
}

export function parseTitleColor(value: unknown): TitleColor | null {
  const name = (asEnumName(value) ?? asString(value))?.trim();
  if (!name) return null;
  const match = TITLE_COLOR_OPTIONS.find(
    (option) => option.value.toLowerCase() === name.toLowerCase(),
  );
  return match?.value ?? null;
}

function premiumFlag(source: unknown, nested: unknown, ...names: string[]) {
  return (
    asBoolean(pickField(nested, ...names)) ??
    asBoolean(pickField(source, ...names)) ??
    false
  );
}

export function parsePremiumFeatures(value: unknown): PremiumFeatures {
  const next = emptyPremiumFeatures();
  if (value == null || value === "") return next;
  let source: unknown = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value) as unknown;
    } catch {
      return next;
    }
  }
  const nested =
    pickField(source, "premiumFeatures", "PremiumFeatures") ?? source;
  next.isShowcase = premiumFlag(
    source,
    nested,
    "isShowcase",
    "isShowCaseItem",
    "IsShowCaseItem",
    "isShowcaseItem",
    "IsShowcaseItem",
  );
  next.isFeatured = premiumFlag(
    source,
    nested,
    "isFeatured",
    "isFeaturedItem",
    "IsFeaturedItem",
    "featured",
    "Featured",
  );
  next.isSponsoredOnsite = premiumFlag(
    source,
    nested,
    "isSponsoredOnsite",
    "IsSponsoredOnsite",
    "isSponsoredOnSite",
    "IsSponsoredOnSite",
  );
  next.isSponsoredOffsite = premiumFlag(
    source,
    nested,
    "isSponsoredOffsite",
    "IsSponsoredOffsite",
    "isSponsoredOffSite",
    "IsSponsoredOffSite",
  );
  next.isHighlighted = premiumFlag(
    source,
    nested,
    "isHighlighted",
    "IsHighlighted",
    "highlighted",
    "Highlighted",
  );
  next.isTitleBoldface = premiumFlag(
    source,
    nested,
    "isTitleBoldface",
    "IsTitleBoldface",
    "titleBoldface",
    "TitleBoldface",
  );
  next.hasViewCounter = premiumFlag(
    source,
    nested,
    "hasViewCounter",
    "HasViewCounter",
    "viewCounter",
    "ViewCounter",
  );
  next.titleColor =
    parseTitleColor(pickField(nested, "titleColor", "TitleColor")) ??
    parseTitleColor(pickField(source, "titleColor", "TitleColor"));
  const scheduled =
    pickField(nested, "scheduledStartingAt", "scheduledStartingDate", "ScheduledStartingDate") ??
    pickField(source, "scheduledStartingAt", "scheduledStartingDate", "ScheduledStartingDate");
  const scheduledAt = asString(scheduled) ?? asDate(scheduled)?.toISOString() ?? null;
  next.scheduledStartingAt = scheduledAt;
  next.isScheduled =
    asBoolean(pickField(nested, "isScheduled")) ??
    asBoolean(pickField(source, "isScheduled")) ??
    Boolean(scheduledAt);
  return next;
}

export function hasAnyPremiumFeature(features: PremiumFeatures) {
  return (
    features.isShowcase ||
    features.isFeatured ||
    features.isSponsoredOnsite ||
    features.isSponsoredOffsite ||
    features.isHighlighted ||
    features.isTitleBoldface ||
    features.hasViewCounter ||
    features.titleColor != null ||
    features.isScheduled
  );
}

export function premiumFeaturesEqual(left: PremiumFeatures, right: PremiumFeatures) {
  return (
    left.isShowcase === right.isShowcase &&
    left.isFeatured === right.isFeatured &&
    left.isSponsoredOnsite === right.isSponsoredOnsite &&
    left.isSponsoredOffsite === right.isSponsoredOffsite &&
    left.isHighlighted === right.isHighlighted &&
    left.isTitleBoldface === right.isTitleBoldface &&
    left.hasViewCounter === right.hasViewCounter &&
    left.titleColor === right.titleColor &&
    left.isScheduled === right.isScheduled &&
    (left.scheduledStartingAt ?? "") === (right.scheduledStartingAt ?? "")
  );
}

export function premiumFeaturesForApi(features: PremiumFeatures) {
  const body: Record<string, unknown> = {
    HasViewCounter: features.hasViewCounter,
    IsFeaturedItem: features.isFeatured,
    IsHighlighted: features.isHighlighted,
    IsShowCaseItem: features.isShowcase,
    IsTitleBoldface: features.isTitleBoldface,
    IsSponsoredOffsite: features.isSponsoredOffsite,
    IsSponsoredOnsite: features.isSponsoredOnsite,
  };
  if (features.titleColor) body.TitleColor = features.titleColor;
  if (features.isScheduled && features.scheduledStartingAt) {
    body.ScheduledStartingDate = features.scheduledStartingAt;
  }
  return body;
}

export type ListingEdits = {
  title: string;
  subtitle: string;
  description: string;
  quantity: number;
  startingBid: number | null;
  buyNowPrice: number | null;
  fixedPrice: number | null;
  sku: string;
  upc: string;
  reservePrice: number | null;
  collectorsElite: boolean;
  paymentMethods: PaymentMethods;
  whoPaysForShipping: number | null;
  shippingProfileId: number | null;
  shippingClasses: ShippingClasses;
  shippingClassCosts: ShippingClassCosts;
  condition: number | null;
  isFflRequired: boolean;
  weight: number | null;
  weightUnit: number | null;
  inspectionPeriod: number | null;
  manufacturer: string;
  caliber: string;
  rounds: number | null;
  mfgPartNumber: string;
  serialNumber: string;
  gtin: string;
  excludeStates: string[];
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
  premiumFeatures: PremiumFeatures;
};
