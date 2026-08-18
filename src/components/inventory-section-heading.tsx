import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InventorySectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("col-span-full", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

export function InventorySectionBreak({ title }: { title: string }) {
  return (
    <div className="col-span-full border-t border-border/60 pt-3 mt-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </p>
    </div>
  );
}
