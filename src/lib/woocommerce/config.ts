export const WOOCOMMERCE_PROVIDER = "woocommerce";

export function normalizeStoreUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Store URL is required.");
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Store URL is not valid.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Store URL must start with https://");
  }
  return `${url.protocol}//${url.host}`;
}

export function originFromUrl(value: string, base?: string) {
  return new URL(value, base).origin;
}
