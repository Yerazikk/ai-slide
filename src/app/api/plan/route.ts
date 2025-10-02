import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { PresentationOutline } from "../../../lib/types";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { notes } = await req.json(); // notes: array of {id, text}

  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    return NextResponse.json({ ok: false, error: "No notes provided" }, { status: 400 });
  }

  const allText = notes.map((n, i) => `Note ${i + 1}:\n${n.text}`).join("\n\n");

  const instruction = `
You are a pitch deck presentation strategist. Your task is to analyze raw notes and create a clean, structured outline for a presentation pitch deck.

STEP 1: ANALYZE & FILTER
- Read all the notes carefully
- Identify the main topic/theme
- Filter out irrelevant or duplicate information
- Determine the target audience

STEP 2: CREATE OUTLINE
- Create a outline for a good pitch deck presentation
Sections of a good picth deck include: Title/Introduction, Problem, Solution, Market Opportunity, Product Demo/How It Works, Business Model, Traction, Go-to-Market Strategy, Competitive Landscape, Team, Financials/Projections, and The Ask.
  * Do not include all sections if its clear there is not enough information. 
- For each section, define:
  * Section title (clear, concise)
  * Intent (what this section should accomplish)
  * Key points (3-5 main points to cover)
  * 
STEP 3: 
- Fill the outline with strategic, relevant content from the notes
- ensure a compelling narrative flow that builds toward the presentation's goal
- If there is not enough information for a section of the outline from the context, leave it out
OUTPUT FORMAT (JSON):
{
  "topic": "Product or pitch name ONLY (1-4 words max, just the name)",
  "audience": "Target audience description",
  "presentationType": "pitch deck | product demo | educational | business proposal | etc.",
  "sections": [
    {
      "sectionTitle": "Introduction",
      "intent": "Hook the audience and establish context",
      "keyPoints": [
        "Point 1",
        "Point 2",
        "Point 3"
      ]
    },
    {
      "sectionTitle": "Problem",
      "intent": "Describe the problem or opportunity",
      "keyPoints": [
        "Point 1",
        "Point 2"
      ]
    }
    // ... more sections
  ]
}

GUIDELINES:
- Be strategic: only include what matters
- Remove redundancy and noise from the notes
- Focus on creating a compelling narrative flow
- Each section should build toward the presentation's goal
- 

Notes:
"""${allText}"""

Return ONLY valid JSON. No markdown, no commentary.`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: "You are a JSON generator. Return only valid JSON, no markdown formatting." },
      { role: "user", content: instruction }
    ]
  });

  let raw = res.choices[0].message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  }

  let outline: PresentationOutline;
  try {
    outline = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON from AI" }, { status: 500 });
  }

  // Validate outline
  if (!outline.topic || !Array.isArray(outline.sections) || outline.sections.length === 0) {
    return NextResponse.json({ ok: false, error: "Invalid outline structure" }, { status: 500 });
  }

  // Save outline to file
  const filePath = path.join(process.cwd(), "data", "outline.json");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(outline, null, 2), "utf8");

  return NextResponse.json({ ok: true, outline });
}
