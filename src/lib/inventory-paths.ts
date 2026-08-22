export const GUNBROKER_INVENTORY_PATH = "/app/inventory/gunbroker";
export const WOOCOMMERCE_INVENTORY_PATH = "/app/inventory/woocommerce";
export const DEFAULTS_PATH = "/app/inventory/defaults";
/** @deprecated use DEFAULTS_PATH */
export const POSTING_TEMPLATE_PATH = DEFAULTS_PATH;

export function wooProductDetailPath(productId: number) {
  return `${WOOCOMMERCE_INVENTORY_PATH}/${productId}`;
}

export function isGunBrokerInventoryPath(pathname: string) {
  return (
    pathname === GUNBROKER_INVENTORY_PATH || /^\/app\/inventory\/\d+/.test(pathname)
  );
}

export function isWooCommerceInventoryPath(pathname: string) {
  return (
    pathname === WOOCOMMERCE_INVENTORY_PATH ||
    /^\/app\/inventory\/woocommerce\/\d+/.test(pathname)
  );
}

export function isDefaultsPath(pathname: string) {
  return pathname === DEFAULTS_PATH;
}

/** @deprecated use isDefaultsPath */
export function isPostingTemplatePath(pathname: string) {
  return isDefaultsPath(pathname);
}
