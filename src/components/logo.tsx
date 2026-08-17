import { cn } from "@/lib/utils";

export function Logo({
  className,
  wordmark = true,
}: {
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 text-accent" aria-hidden>
        <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="16" r="3.2" fill="currentColor" />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const angle = ((deg - 90) * Math.PI) / 180;
          const x = 16 + Math.cos(angle) * 7.8;
          const y = 16 + Math.sin(angle) * 7.8;
          return (
            <circle
              key={deg}
              cx={x}
              cy={y}
              r="2.35"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      {wordmark ? (
        <span className="font-serif text-xl tracking-tight">Chamber</span>
      ) : null}
    </span>
  );
}
