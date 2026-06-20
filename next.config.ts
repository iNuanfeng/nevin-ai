import type { NextConfig } from "next";

function parseAllowedDevOrigins(): string[] {
  const fromEnv = process.env.DEV_ALLOWED_ORIGINS
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;
  // 常见局域网网段（dev 模式 HMR WebSocket 需要）；也可在 .env.local 设 DEV_ALLOWED_ORIGINS=192.168.3.31
  return ["192.168.*.*", "10.*.*.*", "172.*.*.*"];
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp", "tesseract.js"],
  allowedDevOrigins: parseAllowedDevOrigins(),
};

export default nextConfig;
