export function ComingSoon({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">{body}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
        Workspace reserved. Connect the marketplace under Settings when that
        step ships.
      </div>
    </div>
  );
}
