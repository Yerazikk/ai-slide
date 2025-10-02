import { NextResponse } from "next/server";
import { inspectTemplate } from "../../../lib/inspectTemplate";

export async function GET() {
  try {
    const data = await inspectTemplate();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const error = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
