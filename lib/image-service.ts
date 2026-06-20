import sharp from "sharp";
import Tesseract from "tesseract.js";
import { resolveUploadPath } from "@/lib/image-path";
import type { ImageAttachment } from "@/lib/image-utils";

export async function analyzeUploadedImage(imageUrl: string): Promise<ImageAttachment> {
  const filePath = resolveUploadPath(imageUrl);
  const meta = await sharp(filePath).metadata();

  let ocrText = "";
  try {
    const ocrBuffer = await sharp(filePath)
      .rotate()
      .greyscale()
      .normalize()
      .resize({ width: 2000, withoutEnlargement: true })
      .png()
      .toBuffer();

    const result = await Tesseract.recognize(ocrBuffer, "chi_sim+eng", {
      logger: () => {},
    });
    ocrText = result.data.text.replace(/\s+\n/g, "\n").trim();
  } catch {
    ocrText = "";
  }

  return {
    url: imageUrl,
    ocrText,
    width: meta.width,
    height: meta.height,
  };
}

export async function analyzeUploadedImages(imageUrls: string[]): Promise<ImageAttachment[]> {
  const unique = [...new Set(imageUrls.filter(Boolean))];
  return Promise.all(unique.map(analyzeUploadedImage));
}