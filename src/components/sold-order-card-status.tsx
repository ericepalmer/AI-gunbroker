import type { SoldOrderCard } from "@/lib/gunbroker/orders";
import { formatSoldDateOnly } from "@/lib/sold-order-dates";
import { soldOrderCardTheme } from "@/lib/sold-order-card-theme";
import {
  soldOrderPipelineStatus,
  type SoldOrderStepState,
} from "@/lib/sold-order-status";

function StepLabel({
  label,
  state,
  pendingHint,
  doneHint,
}: {
  label: string;
  state: SoldOrderStepState;
  pendingHint?: string;
  doneHint?: string;
}) {
  const hint = state === "pending" ? pendingHint : doneHint;

  return (
    <span
      title={hint}
      className={
        state === "pending"
          ? "text-xs font-medium leading-none line-through"
          : "text-xs font-medium leading-none"
      }
      style={{
        color:
          state === "done" ? soldOrderCardTheme.stepDone : soldOrderCardTheme.stepPending,
      }}
    >
      {label}
    </span>
  );
}

/** Light card: ShipStation + GunBroker progress box. */
export function SoldOrderInProgressStatus({
  order,
  sending,
  onSend,
}: {
  order: SoldOrderCard;
  sending?: boolean;
  onSend?: () => void;
}) {
  const pipeline = soldOrderPipelineStatus(order);

  return (
    <div
      className="ml-auto grid w-[28rem] shrink-0 grid-cols-2 gap-x-24 rounded border px-3 py-1.5 text-left"
      style={{ borderColor: soldOrderCardTheme.inProgress.statusBorder }}
    >
      <div className="min-w-0">
        <p
          className="text-[10px] leading-tight"
          style={{ color: soldOrderCardTheme.inProgress.statusHeading }}
        >
          ShipStation
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {pipeline.shipStationSent === "done" ? (
            <StepLabel label="Sent" state="done" />
          ) : (
            <button
              type="button"
              disabled={sending || !onSend}
              onClick={(event) => {
                event.stopPropagation();
                onSend?.();
              }}
              className="h-4 shrink-0 rounded border border-[#a8b4c8] bg-white/80 px-1.5 text-[10px] font-medium leading-none text-[#141820] disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
            </button>
          )}
          <StepLabel
            label="Shipped"
            state={pipeline.shipStationShipped}
            pendingHint="Waiting for a Sync from ShipStation to notify that the item has been shipped."
            doneHint="Marked shipped — either ShipStation reported it, or GunBroker already shows the order complete."
          />
        </div>
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] leading-tight"
          style={{ color: soldOrderCardTheme.inProgress.statusHeading }}
        >
          GunBroker
        </p>
        <div className="mt-0.5">
          <StepLabel
            label="Notified"
            state={pipeline.gunBrokerNotified}
            pendingHint="Waiting for a Sync from GunBroker to confirm the buyer has been notified that this item shipped."
            doneHint="GunBroker shows this order as shipped or complete, so the buyer has been notified."
          />
        </div>
      </div>
    </div>
  );
}

/** Dark card: Complete label + sold/shipped dates on the right. */
export function SoldOrderShippedStatus({ order }: { order: SoldOrderCard }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-6">
      <p
        className="w-20 text-center font-serif text-sm leading-none"
        style={{ color: soldOrderCardTheme.complete.complete }}
      >
        Complete
      </p>
      <div
        className="w-[8.5rem] text-right text-[11px] leading-tight"
        style={{ color: soldOrderCardTheme.complete.foreground }}
      >
        <p>Sold {formatSoldDateOnly(order.orderDate)}</p>
        <p>Shipped {formatSoldDateOnly(order.shippedDate ?? order.completedAt)}</p>
      </div>
    </div>
  );
}

export function SoldOrderCardStatusPanel({
  order,
  isDark,
  sending,
  onSend,
}: {
  order: SoldOrderCard;
  isDark?: boolean;
  sending?: boolean;
  onSend?: () => void;
}) {
  if (isDark) {
    return (
      <div className="flex w-full items-center gap-4">
        <SoldOrderShippedStatus order={order} />
      </div>
    );
  }
  return <SoldOrderInProgressStatus order={order} sending={sending} onSend={onSend} />;
}
