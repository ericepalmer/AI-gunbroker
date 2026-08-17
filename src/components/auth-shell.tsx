import { Logo } from "@/components/logo";
import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,.25)]">
          <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
