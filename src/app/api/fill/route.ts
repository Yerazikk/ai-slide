import { NextResponse, NextRequest } from "next/server";
import { getGoogleClients } from "../../../lib/google";
import { buildPresentation } from "../../../lib/slideBuilder";

export async function POST(req: NextRequest) {
  try {
    // Get access token from request header
    const authHeader = req.headers.get("authorization");
    const userToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

    const { slides } = getGoogleClients(userToken);

    // Get presentation structure from request body
    const { structure } = await req.json();

    if (!structure || !structure.title || !Array.isArray(structure.slides)) {
      return NextResponse.json({ ok: false, error: "Invalid presentation structure provided" }, { status: 400 });
    }

    // Build presentation
    const deck = await buildPresentation(slides, structure.title, structure.slides);

    return NextResponse.json({ ok: true, ...deck });
  } catch (e) {
    const error = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
