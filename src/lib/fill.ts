import fs from "node:fs/promises";
import path from "node:path";
import { getGoogleClients } from "./google";

type Mapping = Record<string, string>;

export async function fillTemplateFromFile() {
  const { drive, slides } = getGoogleClients();
  const templateId = process.env.TEMPLATE_PRESENTATION_ID!;
  const mappingPath = path.join(process.cwd(), "data", "fill.json");
  const mapping: Mapping = JSON.parse(await fs.readFile(mappingPath, "utf8"));

  // 1) Copy the template deck in your Drive
  const copied = await drive.files.copy({
    fileId: templateId,
    requestBody: { name: `Deck ${new Date().toISOString()}` },
    fields: "id",
  });
  const presentationId = copied.data.id!;
  const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // 2) Build ReplaceAllText requests
  const requests = Object.entries(mapping).map(([key, value]) => ({
    replaceAllText: {
      containsText: { text: `{{${key}}}`, matchCase: true },
      replaceText: value || "", // must not be undefined
    },
  }));

  // 3) Apply all replacements
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  });

  return { presentationId, url };
}
