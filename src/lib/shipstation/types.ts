export type ShipStationSecrets = {
  apiKey: string;
  apiSecret: string;
};

export type ShipStationStatus = {
  status: "connected" | "disconnected" | "error";
  hasCredentials: boolean;
  lastVerifiedAt: string | null;
  lastError: string | null;
};

export type ShipStationAddress = {
  name: string;
  company: string | null;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
};

export type ShipStationOrderItem = {
  lineItemKey: string;
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
};

export type ShipStationCreateOrderInput = {
  orderNumber: string;
  orderKey: string;
  orderDate: string;
  customerUsername: string | null;
  customerEmail: string | null;
  billTo: ShipStationAddress;
  shipTo: ShipStationAddress;
  items: ShipStationOrderItem[];
  amountPaid: number;
  shippingAmount: number;
  taxAmount: number;
  orderId?: number;
};

export type ShipStationOrder = {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  orderStatus: string;
  orderDate: string;
  shipDate: string | null;
  trackingNumber: string | null;
  carrierCode: string | null;
  serviceCode: string | null;
};

export type ShipStationShipment = {
  shipmentId: number;
  orderId: number;
  orderNumber: string;
  carrierCode: string | null;
  serviceCode: string | null;
  trackingNumber: string | null;
  shipDate: string | null;
  voided: boolean;
};

export type ShipStationCheckResult = {
  found: boolean;
  orderStatus: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  shipDate: string | null;
  shipStationOrderId: string | null;
  updated: boolean;
};

export class ShipStationApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ShipStationApiError";
    this.status = status;
  }

  get userMessage() {
    return this.message;
  }
}
