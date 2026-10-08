import { GunBrokerApiError } from "@/lib/gunbroker/types";
import {
  gunBrokerCarrierId,
  markOrderShipped,
  updateOrderShipping,
} from "@/lib/gunbroker/client";
import { withGunBrokerAccess } from "@/lib/gunbroker/service";
import { prisma } from "@/lib/prisma";

/**
 * Send tracking to GunBroker and mark the order shipped so the buyer is notified.
 * GunBroker accepts FedEx, UPS, and USPS only.
 */
export async function notifyGunBrokerOfShipment(
  userId: string,
  orderId: string,
  trackingNumber: string,
  carrier: string | null,
) {
  const tracking = trackingNumber.trim();
  if (!tracking) {
    throw new Error("No tracking number to send to GunBroker.");
  }

  const carrierId = gunBrokerCarrierId(carrier, tracking);
  if (carrierId !== 1 && carrierId !== 2 && carrierId !== 3) {
    throw new Error("GunBroker only accepts FedEx, UPS, or USPS tracking.");
  }

  await withGunBrokerAccess(userId, async (accessToken) => {
    let shippingError: unknown = null;
    try {
      await updateOrderShipping(accessToken, orderId, { trackingNumber: tracking, carrierId });
    } catch (error) {
      if (error instanceof GunBrokerApiError && (error.status === 400 || error.status === 403)) {
        shippingError = error;
      } else {
        throw error;
      }
    }

    try {
      await markOrderShipped(accessToken, orderId);
    } catch (error) {
      if (shippingError) throw shippingError;
      throw error;
    }
  });

  const row = await prisma.soldOrder.findUnique({
    where: { userId_orderId: { userId, orderId } },
    select: { completedAt: true },
  });

  await prisma.soldOrder.update({
    where: { userId_orderId: { userId, orderId } },
    data: {
      gunBrokerNotified: true,
      itemShipped: true,
      workStatus: "complete",
      completedAt: row?.completedAt ?? new Date(),
    },
  });
}
