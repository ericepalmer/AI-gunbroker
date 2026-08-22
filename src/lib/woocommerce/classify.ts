import type { WooKind } from "@/lib/woocommerce/types";

export type { WooKind };

const BRASS_EXCLUDE = /\b(catcher|deflector|magnet|bag)\b/i;
const LOADED_AMMO = /\b(ammo|ammunition|cartridges?)\b/i;
const SUPPRESSOR =
  /\b(suppressors?|supressors?|silencers?|sound\s*suppressors?)\b/i;
const SERVICE = /\b(service|services|transfer|nics)\b/i;
const UNSUPPORTED_RELOADING =
  /\b(primers?|powders?|projectiles?|bullets?|propellant|reloading dies?)\b/i;
const ACCESSORY =
  /\b(accessor(?:y|ies)|holster|optic|scope|magazine|magazines|\bmag\b|cleaning|gun care|lubricat|oil|wipe|wipes|sling|light|case|cases|tumbler)\b/i;

const LINKABLE_KINDS = new Set<WooKind>([
  "ammo",
  "brass",
  "rifles",
  "shotguns",
  "pistols",
  "revolvers",
  "suppressors",
]);

const KIND_LABELS: Record<WooKind, string> = {
  ammo: "Ammo",
  brass: "Brass",
  rifles: "Rifles",
  shotguns: "Shotguns",
  pistols: "Pistols",
  revolvers: "Revolvers",
  suppressors: "Suppressors",
  other: "Other",
};

function categoryMatches(categoryText: string, pattern: RegExp) {
  return pattern.test(categoryText);
}

function classifyFirearmFromText(text: string): WooKind | null {
  if (/\brevolvers?\b/i.test(text)) return "revolvers";
  if (/\b(pistols?|handguns?)\b/i.test(text)) return "pistols";
  if (/\bshotguns?\b/i.test(text)) return "shotguns";
  if (/\b(rifles?|carbines?|receiver)\b/i.test(text)) return "rifles";
  return null;
}

function isBrassProduct(name: string, categoryText: string) {
  const blob = `${name} ${categoryText}`;
  if (BRASS_EXCLUDE.test(blob)) return false;
  return (
    categoryMatches(categoryText, /\bbrass\b/i) ||
    categoryMatches(categoryText, /\bnew brass\b/i) ||
    categoryMatches(categoryText, /\bused brass\b/i) ||
    categoryMatches(categoryText, /\bonce[-\s]?fired\b/i) ||
    /\b(brass|casings?|once[-\s]?fired|unprimed(?:\s+cases?)?|new\s+cases?)\b/i.test(blob)
  );
}

function isUnsupportedCategory(categoryText: string, blob: string) {
  if (categoryMatches(categoryText, UNSUPPORTED_RELOADING)) return true;
  if (/(^|\b)accessor/i.test(categoryText) || /gun care/i.test(categoryText)) return true;
  if (ACCESSORY.test(blob) && !classifyFirearmFromText(blob)) return true;
  return false;
}

/** Prefer WooCommerce store categories; fall back to name heuristics. */
export function classifyWooProduct(name: string, categories: string[]): WooKind {
  const categoryText = categories.join(" ");
  const blob = `${name} ${categoryText}`;

  if (
    categoryMatches(categoryText, /\b(ammunition|ammo)\b/i) ||
    (!categoryText.trim() && LOADED_AMMO.test(name))
  ) {
    return "ammo";
  }
  if (
    categoryMatches(categoryText, /\b(suppressors?|supressors?|silencers?)\b/i) ||
    (!categoryText.trim() && SUPPRESSOR.test(name))
  ) {
    return "suppressors";
  }
  if (isBrassProduct(name, categoryText)) {
    return "brass";
  }
  if (isUnsupportedCategory(categoryText, blob)) {
    return "other";
  }

  const fromCategories = classifyFirearmFromText(categoryText);
  if (fromCategories) return fromCategories;

  if (categoryMatches(categoryText, /\bfirearms?\b/i)) {
    return classifyFirearmFromText(name) ?? "other";
  }
  if (categoryMatches(categoryText, SERVICE)) {
    return "other";
  }

  if (LOADED_AMMO.test(blob)) return "ammo";
  if (SUPPRESSOR.test(blob)) return "suppressors";
  if (isBrassProduct(name, categoryText)) return "brass";
  if (UNSUPPORTED_RELOADING.test(blob)) return "other";
  if (SERVICE.test(blob)) return "other";

  const fromName = classifyFirearmFromText(blob);
  if (fromName) return fromName;

  if (ACCESSORY.test(blob)) return "other";

  return "other";
}

export function wooKindLabel(kind: WooKind) {
  return KIND_LABELS[kind];
}

export function isLinkableWooKind(kind: WooKind) {
  return LINKABLE_KINDS.has(kind);
}

export function matchesWooKeyword(
  product: { name: string; sku: string | null; categories: string[] },
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [product.name, product.sku ?? "", ...product.categories].join(" ").toLowerCase();
  return haystack.includes(needle);
}
