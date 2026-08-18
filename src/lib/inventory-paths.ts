export const GUNBROKER_INVENTORY_PATH = "/app/inventory/gunbroker";
export const WOOCOMMERCE_INVENTORY_PATH = "/app/inventory/woocommerce";

export function isGunBrokerInventoryPath(pathname: string) {
  return (
    pathname === GUNBROKER_INVENTORY_PATH || /^\/app\/inventory\/\d+/.test(pathname)
  );
}

export function isWooCommerceInventoryPath(pathname: string) {
  return pathname === WOOCOMMERCE_INVENTORY_PATH;
}
