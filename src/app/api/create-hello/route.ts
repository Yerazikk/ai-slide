import { NextResponse } from "next/server";
import { createHelloDeck } from "../../../lib/slides";



export async function POST() {
  try {
    const deck = await createHelloDeck();
    return NextResponse.json({ ok: true, ...deck });
  } catch (e) {
    const error = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
