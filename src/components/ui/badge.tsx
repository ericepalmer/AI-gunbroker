import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "default" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "border-border text-muted-foreground",
    accent: "border-accent/40 bg-accent/10 text-accent",
    success: "border-success/40 bg-success/10 text-success",
    warning: "border-accent/40 bg-accent/10 text-accent",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
