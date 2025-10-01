import { NextResponse } from "next/server";
import { inspectTemplate } from "../../../lib/inspectTemplate";

export async function GET() {
  try {
    const data = await inspectTemplate();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
