import {
  emptyPaymentMethods,
  emptyShippingClassCosts,
  emptyShippingClasses,
  normalizeAutoRelistForPriceType,
  parseExcludeStates,
  parsePaymentMethods,
  parseShippingClassCosts,
  parseShippingClasses,
  type PaymentMethods,
  type ShippingClassCosts,
  type ShippingClasses,
} from "@/lib/gunbroker/types";
import { prisma } from "@/lib/prisma";

export type PostingTemplateDetail = {
  isFixedPrice: boolean;
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
  defaultCondition: number | null;
  weight: number | null;
  weightUnit: number | null;
  inspectionPeriod: number | null;
  whoPaysForShipping: number | null;
  shippingProfileId: number | null;
  shippingClasses: ShippingClasses;
  shippingClassCosts: ShippingClassCosts;
  paymentMethods: PaymentMethods;
  excludeStates: string[];
  willShipInternational: boolean;
  prop65Warning: string;
  canOffer: boolean;
  standardTextId: number | null;
  collectorsElite: boolean;
  updatedAt: string;
};

export type PostingTemplateInput = Omit<PostingTemplateDetail, "updatedAt">;

export type PostingDefaults = {
  paymentMethods: PaymentMethods;
  whoPaysForShipping: number | null;
  shippingProfileId: number | null;
  shippingClasses: ShippingClasses;
  shippingClassCosts: ShippingClassCosts;
  condition: number | null;
  isFflRequired: boolean;
  weight: number | null;
  weightUnit: number | null;
  inspectionPeriod: number | null;
  excludeStates: string[];
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
  willShipInternational: boolean;
  prop65Warning: string | null;
  canOffer: boolean;
  standardTextId: number | null;
  collectorsElite: boolean;
};

function toDetail(row: {
  isFixedPrice: boolean;
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
  defaultCondition: number | null;
  weight: number | null;
  weightUnit: number | null;
  inspectionPeriod: number | null;
  whoPaysForShipping: number | null;
  shippingProfileId: number | null;
  shippingClassesJson: string;
  shippingClassCostsJson: string;
  paymentMethodsJson: string;
  excludeStates: string;
  willShipInternational: boolean;
  prop65Warning: string;
  canOffer: boolean;
  standardTextId: number | null;
  collectorsElite: boolean;
  updatedAt: Date;
}): PostingTemplateDetail {
  return {
    isFixedPrice: row.isFixedPrice,
    listingDuration: row.listingDuration,
    autoRelist: row.autoRelist,
    autoRelistFixedCount: row.autoRelistFixedCount,
    defaultCondition: row.defaultCondition,
    weight: row.weight,
    weightUnit: row.weightUnit,
    inspectionPeriod: row.inspectionPeriod,
    whoPaysForShipping: row.whoPaysForShipping,
    shippingProfileId: row.shippingProfileId,
    shippingClasses: parseShippingClasses(row.shippingClassesJson),
    shippingClassCosts: parseShippingClassCosts(row.shippingClassCostsJson),
    paymentMethods: parsePaymentMethods(row.paymentMethodsJson),
    excludeStates: parseExcludeStates(row.excludeStates),
    willShipInternational: row.willShipInternational,
    prop65Warning: row.prop65Warning,
    canOffer: row.canOffer,
    standardTextId: row.standardTextId,
    collectorsElite: row.collectorsElite,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function postingDefaultsFromTemplate(
  template: PostingTemplateDetail,
  options?: { isFflRequired?: boolean },
): PostingDefaults {
  return {
    paymentMethods: template.paymentMethods,
    whoPaysForShipping: template.whoPaysForShipping,
    shippingProfileId: template.shippingProfileId,
    shippingClasses: template.shippingClasses,
    shippingClassCosts: template.shippingClassCosts,
    condition: template.defaultCondition,
    isFflRequired: options?.isFflRequired ?? false,
    weight: template.weight,
    weightUnit: template.weightUnit,
    inspectionPeriod: template.inspectionPeriod,
    excludeStates: template.excludeStates,
    listingDuration: template.listingDuration,
    autoRelist: normalizeAutoRelistForPriceType(
      template.autoRelist,
      template.isFixedPrice,
    ),
    autoRelistFixedCount: template.autoRelistFixedCount,
    willShipInternational: template.willShipInternational,
    prop65Warning: template.prop65Warning || null,
    canOffer: template.canOffer,
    standardTextId: template.standardTextId,
    collectorsElite: template.collectorsElite,
  };
}

export async function getPostingTemplate(userId: string): Promise<PostingTemplateDetail> {
  const row = await prisma.postingTemplate.findUnique({ where: { userId } });
  if (row) return toDetail(row);

  const created = await prisma.postingTemplate.create({
    data: {
      userId,
      paymentMethodsJson: JSON.stringify({
        ...emptyPaymentMethods(),
        VisaMastercard: true,
        Amex: true,
        Discover: true,
      }),
      shippingClassesJson: JSON.stringify({
        ...emptyShippingClasses(),
        Ground: true,
      }),
      shippingClassCostsJson: JSON.stringify(emptyShippingClassCosts()),
    },
  });
  return toDetail(created);
}

export async function savePostingTemplate(userId: string, input: PostingTemplateInput) {
  const autoRelist = normalizeAutoRelistForPriceType(
    input.autoRelist,
    input.isFixedPrice,
  );
  const row = await prisma.postingTemplate.upsert({
    where: { userId },
    create: {
      userId,
      isFixedPrice: input.isFixedPrice,
      listingDuration: input.listingDuration ?? 90,
      autoRelist: autoRelist ?? 4,
      autoRelistFixedCount: autoRelist === 3 ? input.autoRelistFixedCount : null,
      defaultCondition: input.defaultCondition ?? 1,
      weight: input.weight,
      weightUnit: input.weightUnit ?? 1,
      inspectionPeriod: input.inspectionPeriod ?? 1,
      whoPaysForShipping: input.whoPaysForShipping ?? 4,
      shippingProfileId: input.shippingProfileId,
      shippingClassesJson: JSON.stringify(input.shippingClasses),
      shippingClassCostsJson: JSON.stringify(input.shippingClassCosts),
      paymentMethodsJson: JSON.stringify(input.paymentMethods),
      excludeStates: input.excludeStates.join(","),
      willShipInternational: input.willShipInternational,
      prop65Warning: input.prop65Warning,
      canOffer: input.canOffer,
      standardTextId: input.standardTextId,
      collectorsElite: input.collectorsElite,
    },
    update: {
      isFixedPrice: input.isFixedPrice,
      listingDuration: input.listingDuration ?? undefined,
      autoRelist: autoRelist ?? undefined,
      autoRelistFixedCount: autoRelist === 3 ? input.autoRelistFixedCount : null,
      defaultCondition: input.defaultCondition ?? undefined,
      weight: input.weight ?? undefined,
      weightUnit: input.weightUnit ?? undefined,
      inspectionPeriod: input.inspectionPeriod ?? undefined,
      whoPaysForShipping: input.whoPaysForShipping ?? undefined,
      shippingProfileId: input.shippingProfileId,
      shippingClassesJson: JSON.stringify(input.shippingClasses),
      shippingClassCostsJson: JSON.stringify(input.shippingClassCosts),
      paymentMethodsJson: JSON.stringify(input.paymentMethods),
      excludeStates: input.excludeStates.join(","),
      willShipInternational: input.willShipInternational,
      prop65Warning: input.prop65Warning,
      canOffer: input.canOffer,
      standardTextId: input.standardTextId,
      collectorsElite: input.collectorsElite,
    },
  });
  return toDetail(row);
}
