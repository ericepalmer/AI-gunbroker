function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatSoldDateOnly(value: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysSinceSold(orderDate: string | null) {
  if (!orderDate) return null;
  const soldDay = startOfLocalDay(new Date(orderDate));
  const today = startOfLocalDay(new Date());
  const diffMs = today.getTime() - soldDay.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

export function formatDaysSinceSold(orderDate: string | null) {
  const days = daysSinceSold(orderDate);
  if (days == null) return "Unknown sold date";
  if (days === 0) return "Sold today";
  if (days === 1) return "1 day since sold";
  return `${days} days since sold`;
}

export function formatSoldAndShippedDates(
  soldDate: string | null,
  shippedDate: string | null,
) {
  const sold = formatSoldDateOnly(soldDate);
  if (!shippedDate) return `Sold ${sold}`;
  return `Sold ${sold} · Shipped ${formatSoldDateOnly(shippedDate)}`;
}

export function formatElapsedSince(value: string | null) {
  if (!value) return "Never";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}
