import type { WooKind } from "@/lib/woocommerce/types";

export type { WooKind };

const BRASS =
  /\b(brass|casings?|once[-\s]?fired|unprimed(?:\s+cases?)?|new\s+cases?)\b/i;
const BRASS_EXCLUDE = /\b(catcher|deflector|magnet|bag)\b/i;
const PRIMERS = /\bprimers?\b/i;
const POWDER = /\b((?:gun|smokeless|black)[-\s]?powder|propellant)\b|\bpowders?\b/i;
const POWDER_EXCLUDE = /\bpowder[-\s]?coat/i;
const PROJECTILES =
  /\b(projectiles?|bullets?|jacketed|plated bullets?|cast bullets?|lead bullets?)\b/i;
const LOADED_AMMO = /\b(ammo|ammunition|cartridges?)\b/i;
const FIREARM =
  /\b(firearm|firearms|rifle|rifles|pistol|pistols|shotgun|shotguns|revolver|revolvers|handgun|handguns|carbine|receiver)\b/i;
const ACCESSORY =
  /\b(accessor(?:y|ies)|holster|optic|scope|magazine|magazines|\bmag\b|cleaning|gun care|lubricat|oil|wipe|wipes|sling|light|case|cases|dies?|tumbler)\b/i;
const SERVICE = /\b(service|services|transfer|nics)\b/i;

function categoryMatches(categoryText: string, pattern: RegExp) {
  return pattern.test(categoryText);
}

export function classifyWooProduct(name: string, categories: string[]): WooKind {
  const blob = `${name} ${categories.join(" ")}`;
  const categoryText = categories.join(" ");

  if (
    (categoryMatches(categoryText, /\bbrass\b/i) || BRASS.test(blob)) &&
    !BRASS_EXCLUDE.test(blob)
  ) {
    return "brass";
  }
  if (categoryMatches(categoryText, /\bprimers?\b/i) || PRIMERS.test(blob)) {
    return "primers";
  }
  if (
    (categoryMatches(categoryText, /\bpowders?\b/i) || POWDER.test(blob)) &&
    !POWDER_EXCLUDE.test(blob)
  ) {
    return "powder";
  }
  if (
    !LOADED_AMMO.test(blob) &&
    (categoryMatches(categoryText, /\b(projectiles?|bullets?)\b/i) || PROJECTILES.test(blob))
  ) {
    return "projectiles";
  }
  if (categoryMatches(categoryText, /\b(ammunition|ammo)\b/i) || LOADED_AMMO.test(blob)) {
    return "ammo";
  }
  if (/(^|\b)accessor/i.test(categoryText) || /gun care/i.test(categoryText) || ACCESSORY.test(blob)) {
    return "accessories";
  }
  if (SERVICE.test(blob)) return "other";
  if (FIREARM.test(blob)) return "firearms";
  return "other";
}

export function matchesWooKeyword(product: { name: string; sku: string | null; categories: string[] }, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [product.name, product.sku ?? "", ...product.categories].join(" ").toLowerCase();
  return haystack.includes(needle);
}
