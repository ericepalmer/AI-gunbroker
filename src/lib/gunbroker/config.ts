import type { GunBrokerEnvironment } from "@/lib/gunbroker/types";

export const GUNBROKER_PROVIDER = "gunbroker";

const DEFAULTS = {
  sandbox: "https://api.sandbox.gunbroker.com/v1",
  production: "https://api.gunbroker.com/v1",
} as const;

export function gunBrokerEnvironment(): GunBrokerEnvironment {
  return process.env.GUNBROKER_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function gunBrokerApiUrl() {
  return gunBrokerEnvironment() === "production"
    ? (process.env.GUNBROKER_PRODUCTION_API_URL ?? DEFAULTS.production)
    : (process.env.GUNBROKER_SANDBOX_API_URL ?? DEFAULTS.sandbox);
}

export function gunBrokerDevKey() {
  const key =
    gunBrokerEnvironment() === "production"
      ? process.env.GUNBROKER_PRODUCTION_DEVKEY
      : process.env.GUNBROKER_SANDBOX_DEVKEY;
  return key?.trim() || null;
}

export function gunBrokerDefaultUsername() {
  const username =
    gunBrokerEnvironment() === "production"
      ? process.env.GUNBROKER_PRODUCTION_USERNAME
      : process.env.GUNBROKER_SANDBOX_USERNAME;
  return username?.trim() || null;
}

export function gunBrokerDefaultEmail() {
  const email =
    gunBrokerEnvironment() === "production"
      ? process.env.GUNBROKER_PRODUCTION_EMAIL
      : process.env.GUNBROKER_SANDBOX_EMAIL;
  return email?.trim() || null;
}

export const GUNBROKER_USER_AGENT = "Chamber/eepalmer/0.1.0/Inventory";

export function gunBrokerUserAgent() {
  return process.env.GUNBROKER_USER_AGENT?.trim() || GUNBROKER_USER_AGENT;
}
