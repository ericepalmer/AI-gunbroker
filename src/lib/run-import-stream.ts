import type { ImportProgress } from "@/lib/import-progress";

type ImportStreamEvent =
  | ({ type: "progress" } & ImportProgress)
  | { type: "done"; count: number }
  | { type: "error"; error: string };

export async function runImportStream(
  endpoint: string,
  onProgress: (progress: ImportProgress) => void,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const response = await fetch(endpoint, { method: "POST" });
  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      error: payload?.error ?? "Could not start the import.",
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneCount: number | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseEvent(line);
      if (!event) continue;
      if (event.type === "progress") {
        onProgress(event);
        continue;
      }
      if (event.type === "error") {
        return { ok: false, error: event.error };
      }
      doneCount = event.count;
    }
  }

  const trailing = parseEvent(buffer);
  if (trailing?.type === "error") return { ok: false, error: trailing.error };
  if (trailing?.type === "done") doneCount = trailing.count;
  if (trailing?.type === "progress") onProgress(trailing);

  if (doneCount == null) {
    return { ok: false, error: "Import ended before it finished." };
  }
  return { ok: true, count: doneCount };
}

function parseEvent(line: string): ImportStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as ImportStreamEvent;
  } catch {
    return null;
  }
}
