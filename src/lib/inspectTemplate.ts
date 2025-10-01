import { getGoogleClients } from "./google";

/**
 * Helper script to inspect template structure
 */
export async function inspectTemplate() {
  const { slides } = getGoogleClients();
  const templateId = process.env.TEMPLATE_PRESENTATION_ID!;

  const presentation = await slides.presentations.get({
    presentationId: templateId,
  });

  console.log("Template Title:", presentation.data.title);
  console.log("Number of slides:", presentation.data.slides?.length);
  console.log("\nSlide structure:");

  presentation.data.slides?.forEach((slide, idx) => {
    console.log(`\nSlide ${idx}:`);
    console.log("  ID:", slide.objectId);
    console.log("  Elements:", slide.pageElements?.length || 0);

    // List all text elements and their placeholders
    slide.pageElements?.forEach((element) => {
      if (element.shape?.text?.textElements) {
        const texts = element.shape.text.textElements
          .map(t => t.textRun?.content)
          .filter(Boolean)
          .join("");
        if (texts.trim()) {
          console.log(`    Text: "${texts.substring(0, 50)}..."`);
        }
      }
    });
  });

  return presentation.data;
}
