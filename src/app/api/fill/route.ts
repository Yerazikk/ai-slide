import { NextResponse, NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getGoogleClients } from "../../../lib/google";
import { buildPresentation } from "../../../lib/slideBuilder";
import { PresentationStructure } from "../../../lib/types";

export async function POST(req: NextRequest) {
  try {
    // Get access token from request header
    const authHeader = req.headers.get("authorization");
    const userToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

    const { slides } = getGoogleClients(userToken);

    // Load presentation structure from file
    const structurePath = path.join(process.cwd(), "data", "presentation.json");
    const structureData = await fs.readFile(structurePath, "utf8");
    const structure: PresentationStructure = JSON.parse(structureData);

    // Build presentation
    const deck = await buildPresentation(slides, structure.title, structure.slides);

    return NextResponse.json({ ok: true, ...deck });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
