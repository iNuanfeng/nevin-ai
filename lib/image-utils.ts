export interface ImageAttachment {
  url: string;
  ocrText?: string;
  width?: number;
  height?: number;
}

export function parseMessageImages(images: string | null | undefined): ImageAttachment[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (typeof item === "string") return { url: item };
      if (item && typeof item === "object" && "url" in item) {
        const obj = item as ImageAttachment;
        return { url: obj.url, ocrText: obj.ocrText, width: obj.width, height: obj.height };
      }
      return null;
    }).filter(Boolean) as ImageAttachment[];
  } catch {
    return [];
  }
}

export function buildImageContextBlock(attachments: ImageAttachment[]): string {
  if (attachments.length === 0) return "";
  const body = attachments
    .map((img, index) => {
      const lines = [`【用户上传的图片 ${index + 1}】`];
      if (img.width && img.height) lines.push(`尺寸：${img.width}×${img.height}`);
      if (img.ocrText?.trim()) {
        lines.push(`图片中的文字内容（OCR 识别）：\n${img.ocrText.trim()}`);
      } else {
        lines.push("图片中未识别到清晰文字。请结合用户描述，从对话场景（如聊天截图、照片）给出分析。");
      }
      return lines.join("\n");
    })
    .join("\n\n");

  return [
    "【图片说明】你看不到原图，以下是从图片中自动识别出的信息。请严格依据识别内容分析，不要编造图片里不存在的文字或细节。",
    body,
  ].join("\n\n");
}
