export type ImportProgress = {
  loaded: number;
  total: number | null;
  phase: "loading" | "saving";
};

export type ImportProgressHandler = (progress: ImportProgress) => void | Promise<void>;

export function formatImportProgress(progress: ImportProgress) {
  const loaded = progress.loaded.toLocaleString();
  const total =
    progress.total && progress.total > 0 ? progress.total.toLocaleString() : null;
  if (progress.phase === "saving") {
    return total ? `Saving ${loaded} of ${total}…` : `Saving ${loaded}…`;
  }
  if (total && progress.total && progress.loaded <= progress.total) {
    return `Importing… ${loaded} of ${total}`;
  }
  return `Importing… ${loaded}`;
}

export async function reportImportProgress(
  onProgress: ImportProgressHandler | undefined,
  progress: ImportProgress,
) {
  await onProgress?.(progress);
}

export async function reportSaveProgress(
  onProgress: ImportProgressHandler | undefined,
  index: number,
  total: number,
) {
  if (!onProgress) return;
  if (index === 0 || (index + 1) % 25 === 0 || index + 1 === total) {
    await onProgress({ loaded: index + 1, total, phase: "saving" });
  }
}
