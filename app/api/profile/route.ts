import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/profile-service";

export const runtime = "nodejs";

/**
 * GET /api/profile — 获取用户档案
 */
export async function GET() {
  try {
    const profile = getProfile();
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/profile — 更新用户档案
 * 请求体：{ name?, background?, values?, personality?, life_goals?, habits? }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const profile = updateProfile(body);
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
