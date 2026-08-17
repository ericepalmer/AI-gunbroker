"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type EditorPicture = {
  key: string;
  url: string;
  pictureId: string | null;
  file?: File;
};

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|gif|png|webp)$/i.test(file.name);
}

async function toGunBrokerImage(file: File) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/gif" ||
    /\.jpe?g$/i.test(name) ||
    /\.gif$/i.test(name)
  ) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not convert image.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Could not convert image."))),
      "image/jpeg",
      0.92,
    );
  });
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

export function ListingPhotos({
  pictures,
  onRemove,
  onAdd,
  disabled,
}: {
  pictures: EditorPicture[];
  onRemove: (key: string) => void;
  onAdd: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function takeFiles(list: FileList | File[] | null) {
    if (!list || disabled) return;
    const files = Array.from(list).filter(isImageFile);
    const converted: File[] = [];
    for (const file of files) {
      try {
        converted.push(await toGunBrokerImage(file));
      } catch {
        toast.error(`${file.name} could not be added. Use a JPEG or GIF.`);
      }
    }
    if (converted.length) onAdd(converted);
  }

  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {pictures.map((picture) => (
        <div key={picture.key} className="relative h-36 w-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={picture.url}
            alt=""
            className="h-36 w-36 rounded-xl border border-border object-cover"
          />
          <button
            type="button"
            aria-label="Delete image"
            disabled={disabled}
            onClick={() => onRemove(picture.key)}
            className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-destructive hover:text-white disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          takeFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-accent/60 hover:text-foreground disabled:opacity-50",
          dragging ? "border-accent bg-accent/10 text-foreground" : null,
        )}
      >
        <ImagePlus className="h-7 w-7" />
        <span className="px-2 text-center text-xs">Add photo</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/gif,image/png,image/webp,.jpg,.jpeg,.gif,.png,.webp"
        multiple
        className="hidden"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
