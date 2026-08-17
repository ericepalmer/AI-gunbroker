import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractUrls } from "@/lib/utils";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default async function DevInboxPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const emails = await prisma.devEmail.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <Link href="/login" className="text-sm text-accent hover:underline">
          Log in
        </Link>
      </div>
      <h1 className="font-serif text-4xl tracking-tight">Local email inbox</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Development only. Verification and reset links are stored here when Resend
        is not configured.
      </p>
      <div className="mt-8 space-y-4">
        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          emails.map((email) => {
            const urls = extractUrls(email.text);
            return (
              <article
                key={email.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  {email.to}
                </p>
                <h2 className="mt-1 font-serif text-2xl">{email.subject}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {email.createdAt.toLocaleString()}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {email.text}
                </p>
                {urls.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    {urls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        className="block break-all text-sm text-accent hover:underline"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
