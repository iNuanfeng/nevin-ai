import fs from "fs";
import path from "path";

export function resolveUploadPath(imageUrl: string): string {
  const normalized = imageUrl.replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/")) {
    throw new Error(`Invalid upload path: ${imageUrl}`);
  }
  const filePath = path.join(process.cwd(), "data", normalized);
  const uploadsRoot = path.join(process.cwd(), "data", "uploads");
  if (!filePath.startsWith(uploadsRoot)) {
    throw new Error(`Invalid upload path: ${imageUrl}`);
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Upload not found: ${imageUrl}`);
  }
  return filePath;
}
