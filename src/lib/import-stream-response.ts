import { revalidateInventoryPages } from "@/lib/revalidate-inventory";
import type { ImportProgress, ImportProgressHandler } from "@/lib/import-progress";

type ImportEvent =
  | ({ type: "progress" } & ImportProgress)
  | { type: "done"; count: number }
  | { type: "error"; error: string };

export function ndjsonImportResponse(
  run: (onProgress: ImportProgressHandler) => Promise<{ count: number }>,
) {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  let writes = Promise.resolve();

  function send(event: ImportEvent) {
    writes = writes.then(() =>
      writer.write(encoder.encode(`${JSON.stringify(event)}\n`)),
    );
    return writes;
  }

  void (async () => {
    try {
      const result = await run((progress) =>
        send({ type: "progress", ...progress }),
      );
      revalidateInventoryPages();
      await send({ type: "done", count: result.count });
    } catch (error) {
      await send({
        type: "error",
        error: error instanceof Error ? error.message : "Could not import.",
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
