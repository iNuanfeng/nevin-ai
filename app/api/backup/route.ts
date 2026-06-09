import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "data", "nevin.db");
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "No database found" }, { status: 404 });
    }
    const file = fs.readFileSync(dbPath);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="nevin-backup-${date}.db"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
