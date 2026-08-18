import {
  emptyPremiumFeatures,
  PREMIUM_FLAG_OPTIONS,
  type PremiumFeatures,
} from "@/lib/gunbroker/types";

export type ListingFeeLine = {
  label: string;
  amount: number;
};

export type ListingFeeSummary = {
  lines: ListingFeeLine[];
  total: number;
};

export type ListingFeeInput = {
  subtitle?: string | null;
  reservePrice?: number | null;
  isFixedPrice?: boolean;
  listingDuration?: number | null;
  premiumFeatures?: PremiumFeatures | null;
  includeScheduled?: boolean;
};

export const LISTING_FEE_AMOUNTS = {
  subtitle: 3.5,
  isShowcase: 4.95,
  isFeatured: 2.95,
  isSponsoredOnsite: 4,
  isSponsoredOffsite: 7,
  isHighlighted: 2,
  isTitleBoldface: 1,
  titleColor: 1,
  hasViewCounter: 0.5,
  scheduled: 0.1,
  shortDuration: 0.5,
} as const;

export function formatFeeUsd(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function listingFeeSummary(lines: ListingFeeLine[]): ListingFeeSummary {
  return {
    lines,
    total: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100,
  };
}

export function reserveListingFee(reservePrice: number | null | undefined) {
  if (reservePrice == null || reservePrice <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round(reservePrice * 0.02 * 100) / 100));
}

function premiumFrom(input: ListingFeeInput): PremiumFeatures {
  return { ...emptyPremiumFeatures(), ...input.premiumFeatures };
}

export function optionalListingFeeLines(input: ListingFeeInput): ListingFeeLine[] {
  const lines: ListingFeeLine[] = [];
  const premium = premiumFrom(input);

  if (input.subtitle?.trim()) {
    lines.push({ label: "Subtitle", amount: LISTING_FEE_AMOUNTS.subtitle });
  }
  if (!input.isFixedPrice) {
    const reserveFee = reserveListingFee(input.reservePrice);
    if (reserveFee > 0) {
      lines.push({ label: "Reserve price", amount: reserveFee });
    }
    if (input.listingDuration === 1 || input.listingDuration === 3) {
      lines.push({
        label: `${input.listingDuration}-day listing`,
        amount: LISTING_FEE_AMOUNTS.shortDuration,
      });
    }
  }
  for (const option of PREMIUM_FLAG_OPTIONS) {
    if (!premium[option.key]) continue;
    lines.push({
      label: option.label,
      amount: LISTING_FEE_AMOUNTS[option.key],
    });
  }
  if (premium.titleColor) {
    lines.push({
      label: "Make my listing title colored",
      amount: LISTING_FEE_AMOUNTS.titleColor,
    });
  }
  if (input.includeScheduled !== false && premium.isScheduled) {
    lines.push({
      label: "Scheduled Listing",
      amount: LISTING_FEE_AMOUNTS.scheduled,
    });
  }
  return lines;
}

export function cloneListingFeeSummary(input: ListingFeeInput): ListingFeeSummary {
  return listingFeeSummary(
    optionalListingFeeLines({
      isFixedPrice: input.isFixedPrice,
      listingDuration: input.listingDuration,
      premiumFeatures: input.premiumFeatures,
      includeScheduled: false,
    }),
  );
}

export function addedListingFeeSummary(
  current: ListingFeeInput,
  next: ListingFeeInput,
): ListingFeeSummary {
  const lines: ListingFeeLine[] = [];
  const currentPremium = premiumFrom(current);
  const nextPremium = premiumFrom(next);

  if (!current.subtitle?.trim() && next.subtitle?.trim()) {
    lines.push({ label: "Subtitle", amount: LISTING_FEE_AMOUNTS.subtitle });
  }
  if (!next.isFixedPrice) {
    const hadReserve = reserveListingFee(current.reservePrice) > 0;
    const nextReserve = reserveListingFee(next.reservePrice);
    if (!hadReserve && nextReserve > 0) {
      lines.push({ label: "Reserve price", amount: nextReserve });
    }
    const hadShort =
      current.listingDuration === 1 || current.listingDuration === 3;
    const nextShort =
      next.listingDuration === 1 || next.listingDuration === 3;
    if (!hadShort && nextShort && next.listingDuration) {
      lines.push({
        label: `${next.listingDuration}-day listing`,
        amount: LISTING_FEE_AMOUNTS.shortDuration,
      });
    }
  }
  for (const option of PREMIUM_FLAG_OPTIONS) {
    if (!currentPremium[option.key] && nextPremium[option.key]) {
      lines.push({
        label: option.label,
        amount: LISTING_FEE_AMOUNTS[option.key],
      });
    }
  }
  if (!currentPremium.titleColor && nextPremium.titleColor) {
    lines.push({
      label: "Make my listing title colored",
      amount: LISTING_FEE_AMOUNTS.titleColor,
    });
  }
  if (!currentPremium.isScheduled && nextPremium.isScheduled) {
    lines.push({
      label: "Scheduled Listing",
      amount: LISTING_FEE_AMOUNTS.scheduled,
    });
  }
  return listingFeeSummary(lines);
}
