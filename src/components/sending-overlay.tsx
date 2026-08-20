"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function SendingOverlay({
  open,
  title,
  detail,
}: {
  open: boolean;
  title: string;
  detail?: string | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md"
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      aria-labelledby="sending-overlay-title"
    >
      <div className="flex h-[min(86vh,52rem)] w-[min(96vw,80rem)] flex-col items-center justify-center rounded-3xl border-2 border-accent bg-card px-8 py-16 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div
          className="mb-8 size-16 animate-spin rounded-full border-4 border-muted border-t-accent"
          aria-hidden
        />
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">Sending</p>
        <h2
          id="sending-overlay-title"
          className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl md:text-6xl"
        >
          {title}
        </h2>
        {detail ? (
          <p className="mt-5 max-w-3xl text-xl text-foreground/90 sm:text-2xl">{detail}</p>
        ) : null}
        <p className="mt-8 max-w-xl text-base text-muted-foreground">
          This can take a minute. Stay on this page until it finishes.
        </p>
      </div>
    </div>,
    document.body,
  );
}
