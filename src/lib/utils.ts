import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAdminRole(role?: string | null) {
  if (!role) return false;
  return role.split(",").map((part) => part.trim()).includes("admin");
}

export function extractUrls(text: string) {
  return text.match(/https?:\/\/[^\s<>"]+/g) ?? [];
}
