"use client";

import { X } from "lucide-react";
import { parseMessageImages, type ImageAttachment } from "@/lib/image-utils";

function toAttachments(input: ImageAttachment[] | string[]): ImageAttachment[] {
  return input.map((item) => (typeof item === "string" ? { url: item } : item));
}

export default function ImageThumbStrip({
  images,
  onRemove,
  size = "md",
}: {
  images: ImageAttachment[] | string[];
  onRemove?: (index: number) => void;
  size?: "sm" | "md";
}) {
  const attachments = toAttachments(images);
  if (attachments.length === 0) return null;

  const box = size === "sm" ? "w-14 h-14" : "w-16 h-16";

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {attachments.map((img, index) => (
        <div key={`${img.url}-${index}`} className={`relative ${box} flex-shrink-0`}>
          <img
            src={img.url}
            alt="上传图片"
            className={`${box} rounded-xl object-cover border border-[#e8e8ed] bg-[#f2f3f5]`}
          />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center border-none cursor-pointer"
              aria-label="移除图片"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function MessageImages({ images }: { images?: string | null }) {
  const attachments = parseMessageImages(images);
  if (attachments.length === 0) return null;
  return (
    <div className="mb-2">
      <ImageThumbStrip images={attachments} size="sm" />
    </div>
  );
}
