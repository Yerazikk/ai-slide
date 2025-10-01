import { getGoogleClients } from "./google";

export async function createHelloDeck(): Promise<{ id: string; url: string; }> {
  const { slides } = getGoogleClients();

  // 1) Create empty presentation
  const pres = await slides.presentations.create({
    requestBody: { title: `AI Slide Demo ${new Date().toISOString()}` },
  });
  const presentationId = pres.data.presentationId!;
  const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // 2) Add a title slide with some text
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        { createSlide: { slideLayoutReference: { predefinedLayout: "TITLE" } } },
        { insertText: {
            objectId: pres.data.slides?.[0]?.pageElements?.[0]?.objectId || "title",
            insertionIndex: 0,
            text: "Hello from Phase 0 👋",
        }},
      ],
    },
  });

  return { id: presentationId, url };
}
