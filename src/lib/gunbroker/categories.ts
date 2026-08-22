import type { WooKind } from "@/lib/woocommerce/types";

/** GunBroker leaf category IDs used when creating/pushing from WooCommerce. */
export const GUNBROKER_CATEGORY = {
  AMMO: 1012,
  RELOADING: 1016,
  RIFLE_AMMO: 3017,
  HANDGUN_AMMO: 3018,
  RIMFIRE_AMMO: 3501,
  /** Silencers (NFA) — Spring 2025 category. */
  SILENCERS: 3503,
  /** Fallback if Silencers leaf is unavailable on older GB responses. */
  SUPPRESSED_FIREARMS: 3099,
  REVOLVERS: 2325,
  SEMI_AUTO_PISTOLS: 3026,
  SINGLE_SHOT_PISTOLS: 3101,
  OTHER_PISTOLS: 3027,
  BOLT_ACTION_RIFLES: 3022,
  LEVER_ACTION_RIFLES: 3023,
  SEMI_AUTO_RIFLES: 3024,
  OTHER_RIFLES: 3025,
  PUMP_ACTION_SHOTGUNS: 3106,
  SEMI_AUTO_SHOTGUNS: 3105,
  OTHER_SHOTGUNS: 3108,
} as const;

function resolvePistolCategoryId(name: string, categories: string[]) {
  const blob = `${name} ${categories.join(" ")}`;
  if (/\bsingle[-\s]?shot\b/i.test(blob)) return GUNBROKER_CATEGORY.SINGLE_SHOT_PISTOLS;
  if (/\bsemi[-\s]?auto\b/i.test(blob)) return GUNBROKER_CATEGORY.SEMI_AUTO_PISTOLS;
  return GUNBROKER_CATEGORY.SEMI_AUTO_PISTOLS;
}

function resolveRifleCategoryId(name: string, categories: string[]) {
  const blob = `${name} ${categories.join(" ")}`;
  if (/\bbolt\b/i.test(blob)) return GUNBROKER_CATEGORY.BOLT_ACTION_RIFLES;
  if (/\blever\b/i.test(blob)) return GUNBROKER_CATEGORY.LEVER_ACTION_RIFLES;
  if (/\bsemi[-\s]?auto\b/i.test(blob) || /\bar-?\d+\b/i.test(blob)) {
    return GUNBROKER_CATEGORY.SEMI_AUTO_RIFLES;
  }
  return GUNBROKER_CATEGORY.OTHER_RIFLES;
}

function resolveShotgunCategoryId(name: string, categories: string[]) {
  const blob = `${name} ${categories.join(" ")}`;
  if (/\bpump\b/i.test(blob)) return GUNBROKER_CATEGORY.PUMP_ACTION_SHOTGUNS;
  if (/\bsemi[-\s]?auto\b/i.test(blob)) return GUNBROKER_CATEGORY.SEMI_AUTO_SHOTGUNS;
  return GUNBROKER_CATEGORY.OTHER_SHOTGUNS;
}

/** Pick ammo leaf category from Woo product name / categories. */
export function resolveAmmoCategoryId(name: string, categories: string[] = []) {
  const blob = `${name} ${categories.join(" ")}`.toLowerCase();

  if (/\b(rimfire|\.22\b|22lr|22 lr|17 hmr|22 mag|22 wmr)\b/i.test(blob)) {
    return GUNBROKER_CATEGORY.RIMFIRE_AMMO;
  }
  if (/\b(30-06|308 win|\.308|7\.62|5\.56|\.223|243 win|270 win|300 win|45-70|25-06|280 rem|338|50 bmg|6\.5|7mm|8mm mauser|rifle ammo)\b/i.test(blob)) {
    return GUNBROKER_CATEGORY.RIFLE_AMMO;
  }
  return GUNBROKER_CATEGORY.HANDGUN_AMMO;
}

/**
 * Pick a GunBroker CategoryID from Woo Category Kind and store categories.
 * Returns null when Chamber has no mapping (other / unsupported).
 */
export function resolveGunBrokerCategoryId(input: {
  kind: WooKind;
  name: string;
  categories?: string[];
}): number | null {
  const categories = input.categories ?? [];

  switch (input.kind) {
    case "ammo":
      return resolveAmmoCategoryId(input.name, categories);
    case "suppressors":
      return GUNBROKER_CATEGORY.SILENCERS;
    case "brass":
      return GUNBROKER_CATEGORY.RELOADING;
    case "revolvers":
      return GUNBROKER_CATEGORY.REVOLVERS;
    case "pistols":
      return resolvePistolCategoryId(input.name, categories);
    case "rifles":
      return resolveRifleCategoryId(input.name, categories);
    case "shotguns":
      return resolveShotgunCategoryId(input.name, categories);
    default:
      return null;
  }
}

export function categoryRequiresFfl(categoryId: number | null | undefined) {
  if (categoryId == null) return false;
  return (
    categoryId === GUNBROKER_CATEGORY.SILENCERS ||
    categoryId === GUNBROKER_CATEGORY.SUPPRESSED_FIREARMS ||
    categoryId === GUNBROKER_CATEGORY.REVOLVERS ||
    categoryId === GUNBROKER_CATEGORY.SEMI_AUTO_PISTOLS ||
    categoryId === GUNBROKER_CATEGORY.SINGLE_SHOT_PISTOLS ||
    categoryId === GUNBROKER_CATEGORY.OTHER_PISTOLS ||
    categoryId === GUNBROKER_CATEGORY.BOLT_ACTION_RIFLES ||
    categoryId === GUNBROKER_CATEGORY.LEVER_ACTION_RIFLES ||
    categoryId === GUNBROKER_CATEGORY.SEMI_AUTO_RIFLES ||
    categoryId === GUNBROKER_CATEGORY.OTHER_RIFLES ||
    categoryId === GUNBROKER_CATEGORY.PUMP_ACTION_SHOTGUNS ||
    categoryId === GUNBROKER_CATEGORY.SEMI_AUTO_SHOTGUNS ||
    categoryId === GUNBROKER_CATEGORY.OTHER_SHOTGUNS
  );
}

const CATEGORY_LABELS: Record<number, string> = {
  [GUNBROKER_CATEGORY.AMMO]: "Ammunition",
  [GUNBROKER_CATEGORY.RELOADING]: "Reloading",
  [GUNBROKER_CATEGORY.RIFLE_AMMO]: "Rifle ammo",
  [GUNBROKER_CATEGORY.HANDGUN_AMMO]: "Handgun ammo",
  [GUNBROKER_CATEGORY.RIMFIRE_AMMO]: "Rimfire ammo",
  [GUNBROKER_CATEGORY.SILENCERS]: "Silencers",
  [GUNBROKER_CATEGORY.SUPPRESSED_FIREARMS]: "Suppressed firearms",
  [GUNBROKER_CATEGORY.REVOLVERS]: "Revolvers",
  [GUNBROKER_CATEGORY.SEMI_AUTO_PISTOLS]: "Semi-auto pistols",
  [GUNBROKER_CATEGORY.SINGLE_SHOT_PISTOLS]: "Single-shot pistols",
  [GUNBROKER_CATEGORY.OTHER_PISTOLS]: "Other pistols",
  [GUNBROKER_CATEGORY.BOLT_ACTION_RIFLES]: "Bolt-action rifles",
  [GUNBROKER_CATEGORY.LEVER_ACTION_RIFLES]: "Lever-action rifles",
  [GUNBROKER_CATEGORY.SEMI_AUTO_RIFLES]: "Semi-auto rifles",
  [GUNBROKER_CATEGORY.OTHER_RIFLES]: "Other rifles",
  [GUNBROKER_CATEGORY.PUMP_ACTION_SHOTGUNS]: "Pump-action shotguns",
  [GUNBROKER_CATEGORY.SEMI_AUTO_SHOTGUNS]: "Semi-auto shotguns",
  [GUNBROKER_CATEGORY.OTHER_SHOTGUNS]: "Other shotguns",
};

export function gunBrokerCategoryLabel(categoryId: number | null | undefined) {
  if (categoryId == null) return null;
  return CATEGORY_LABELS[categoryId] ?? `Category ${categoryId}`;
}
