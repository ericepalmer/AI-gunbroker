"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function ImpersonationBanner() {
  const router = useRouter();

  async function stop() {
    await authClient.admin.stopImpersonating();
    router.push("/app/admin");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-accent/40 bg-accent/10 px-6 py-2 text-sm">
      <p>You are viewing this desk as another user.</p>
      <button type="button" onClick={stop} className="text-accent hover:underline">
        Stop impersonating
      </button>
    </div>
  );
}
