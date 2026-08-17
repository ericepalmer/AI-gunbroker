import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-40 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent/70 focus:ring-2 focus:ring-ring/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
