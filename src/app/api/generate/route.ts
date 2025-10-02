import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { PresentationStructure, PresentationOutline } from "../../../lib/types";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST() {
  try {
    // Load outline from file (created by /api/plan)
    const outlinePath = path.join(process.cwd(), "data", "outline.json");
    const outlineData = await fs.readFile(outlinePath, "utf8");
    const outline: PresentationOutline = JSON.parse(outlineData);

    const instruction = `
You are a pitch-deck generator that creates dynamic slide presentations following a professional design system.

You will receive a structured outline with sections and key points. Your task: Convert this outline into slides, choosing the best layout for each section.

DESIGN SYSTEM & STYLING:
COLORS:
- Background: #13131A (dark mode)
- Main text: #FFFFFF (white)
- Highlight color for important words: #AAB4E9 (light blue)
- Visual elements: #606065 (gray)
- Accent colors (use sparingly): #21292D, #111826, #0B1018, #11131C

TYPOGRAPHY:
- Font: Inter (Bold for headings, Light for body text)
- Desktop: Headings 50pt, Body 16pt
- Mobile: Headings 25pt, Body 12pt
- Headings use FFFFFF only
- Use AAB4E9 to highlight important keywords in body text

DESIGN PRINCIPLES:
- Minimal, high-contrast design (think Notion, Obsidian)
- Dark backgrounds with light text for readability
- Keep text concise - aim for 3-5 bullets per column, each bullet should be brief
- Use professional, business-focused language
- Maintain visual balance across columns
- Try different layouts (2 column, 3 column, 1 column) to keep it interesting

AVAILABLE SLIDE TYPES & LAYOUTS:
1. "TITLE" - Title slide
   - title: Product or pitch name ONLY (1-4 words max, just the name, no descriptive words)
   - subtitle: Tagline/positioning statement (concise, 5-12 words, should convey value proposition)

2. "TITLE_BODY" - Quote slide
   - body: A powerful quote or key statement (1-2 sentences, impactful and memorable)
   - Note: This is displayed as a large, left-aligned quote without a title

3. "ONE_COLUMN" - Title with single column
   - title: Section title (clear, descriptive, 2-5 words)
   - columns: [{"heading": "Optional subheading", "bullets": ["Concise point 1", "Concise point 2", "Concise point 3"]}]
   - Use 3-5 bullets, each 3-8 words

4. "TWO_COLUMN" - Title with two columns
   - title: Section title (clear, descriptive, 2-5 words)
   - columns: [
       {"heading": "Column 1 heading", "bullets": ["Point 1", "Point 2", "Point 3"]},
       {"heading": "Column 2 heading", "bullets": ["Point 1", "Point 2", "Point 3"]}
     ]
   - Balance content across columns (3-4 bullets each)
   - Column headings should be 1-3 words

5. "THREE_COLUMN" - Title with three columns
   - title: Section title (clear, descriptive, 2-5 words)
   - columns: [
       {"heading": "Column 1", "bullets": ["Point 1", "Point 2", "Point 3"]},
       {"heading": "Column 2", "bullets": ["Point 1", "Point 2", "Point 3"]},
       {"heading": "Column 3", "bullets": ["Point 1", "Point 2", "Point 3"]}
     ]
   - Use for feature lists, comparisons, or three-part frameworks
   - 3-4 bullets per column, keep brief

OUTPUT FORMAT (JSON):
{
  "title": "Deck title",
  "slides": [
    {
      "layout": "TITLE",
      "title": "Project name",
      "subtitle": "Tagline"
    },
    {
      "layout": "ONE_COLUMN" | "TWO_COLUMN" | "THREE_COLUMN" | "TITLE_BODY",
      "title": "Slide title",
      "body": "Body text" (if TITLE_BODY),
      "columns": [...] (if column layout),
      "footer": "2"
    }
    // ... add as many slides as needed
  ]
}

CONTENT RULES:
- First slide should be "TITLE" layout using outline.topic
- Create 1-3 slides per section depending on content density
- Choose layouts that best fit each section's content and key points
- Use TITLE_BODY for impactful quotes or key statements
- Use ONE_COLUMN for simple lists
- Use TWO_COLUMN for comparisons, before/after, problem/solution
- Use THREE_COLUMN for feature lists, three-part frameworks, benefits
- Keep all text concise and punchy - this is a pitch deck, not a document
- Use action-oriented language in bullets
- Avoid redundancy across slides
- Use empty arrays [] if no bullets needed for a column
- Include sequential page numbers in footer field (starting at "2" for first body slide)
- Total deck should be 8-15 slides

OUTLINE TO CONVERT:
Topic: ${outline.topic}
Audience: ${outline.audience}
Type: ${outline.presentationType}

Sections:
${outline.sections.map((s, i) => `
${i + 1}. ${s.sectionTitle}
   Intent: ${s.intent}
   Key Points:
${s.keyPoints.map(p => `   - ${p}`).join('\n')}
`).join('\n')}

Return ONLY valid JSON. No markdown, no commentary.`;

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are a JSON generator. Return only valid JSON, no markdown formatting." },
        { role: "user", content: instruction }
      ]
    });

    let raw = res.choices[0].message?.content?.trim() || "{}";
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    }

    let structure: PresentationStructure;
    try {
      structure = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON from AI" }, { status: 500 });
    }

    // Validate structure
    if (!structure.title || !Array.isArray(structure.slides) || structure.slides.length === 0) {
      return NextResponse.json({ ok: false, error: "Invalid presentation structure" }, { status: 500 });
    }

    // Save to file
    const filePath = path.join(process.cwd(), "data", "presentation.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(structure, null, 2), "utf8");

    return NextResponse.json({ ok: true, preview: structure });
  } catch (e) {
    const error = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
