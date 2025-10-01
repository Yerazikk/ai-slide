import { NextResponse } from "next/server";
import { createHelloDeck } from "../../../lib/slides";



export async function POST() {
  try {
    const deck = await createHelloDeck();
    return NextResponse.json({ ok: true, ...deck });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
