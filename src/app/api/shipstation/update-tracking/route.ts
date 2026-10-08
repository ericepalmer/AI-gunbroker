import { NextResponse } from "next/server";
import type { ImportProgress, ImportProgressHandler } from "@/lib/import-progress";
import { revalidateShipStationPages } from "@/lib/revalidate-shipstation";
import { getSession } from "@/lib/session";
import { updateShipStationDesk } from "@/lib/shipstation/desk";

export const dynamic = "force-dynamic";

type ProgressEvent =
  | ({ type: "progress" } & ImportProgress)
  | {
      type: "done";
      count: number;
      awaitingSynced: number;
      purged: number;
      tracked: number;
      delivered: number;
      withEta: number;
    }
  | { type: "error"; error: string };

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to update ShipStation tracking." }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  let writes = Promise.resolve();

  function send(event: ProgressEvent) {
    writes = writes.then(() => writer.write(encoder.encode(`${JSON.stringify(event)}\n`)));
    return writes;
  }

  void (async () => {
    try {
      const onProgress: ImportProgressHandler = (progress) =>
        send({ type: "progress", ...progress });
      const result = await updateShipStationDesk(session.user.id, onProgress);
      revalidateShipStationPages();
      await send({
        type: "done",
        count: result.count,
        awaitingSynced: result.awaitingSynced,
        purged: result.purged,
        tracked: result.tracked,
        delivered: result.delivered,
        withEta: result.withEta,
      });
    } catch (error) {
      await send({
        type: "error",
        error: error instanceof Error ? error.message : "Could not update tracking.",
      });
    } finally {
      try {
        await writes;
        await writer.close();
      } catch {
        // Client disconnected.
      }
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
