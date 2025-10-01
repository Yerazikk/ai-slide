import OpenAI from "openai";
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// placeholder function you’ll call later
export async function summarizeNotes(notes: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "You write concise slide bullets (≤12 words each)." },
      { role: "user", content: `Notes:\n${notes}\n\nReturn 3 bullets.` }
    ],
  });
  return res.choices[0]?.message?.content || "";
}
