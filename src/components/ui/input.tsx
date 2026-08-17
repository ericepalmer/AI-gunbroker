import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
