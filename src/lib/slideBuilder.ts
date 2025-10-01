import { google } from "googleapis";
import type { slides_v1 } from "googleapis";
import { SlideData, Column } from "./types";

type Request = slides_v1.Schema$Request;

// Layout constants (using predefined Google Slides layouts)
const LAYOUTS = {
  TITLE: "TITLE",
  TITLE_BODY: "TITLE_AND_BODY",
  BLANK: "BLANK",
} as const;

/**
 * Builds a complete presentation from structured slide data
 */
export async function buildPresentation(
  slidesApi: slides_v1.Slides,
  title: string,
  slideData: SlideData[]
): Promise<{ id: string; url: string }> {
  // 1) Create empty presentation
  const pres = await slidesApi.presentations.create({
    requestBody: { title },
  });
  const presentationId = pres.data.presentationId!;
  const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // 2) Build slides one by one (can't batch because we need slide IDs)
  for (let i = 0; i < slideData.length; i++) {
    const slide = slideData[i];

    // Create slide with appropriate layout
    if (slide.layout === "TITLE") {
      await createTitleSlide(slidesApi, presentationId, slide, i);
    } else if (slide.layout === "TITLE_BODY") {
      await createTitleBodySlide(slidesApi, presentationId, slide, i);
    } else if (slide.layout === "ONE_COLUMN") {
      await createColumnSlide(slidesApi, presentationId, slide, 1, i);
    } else if (slide.layout === "TWO_COLUMN") {
      await createColumnSlide(slidesApi, presentationId, slide, 2, i);
    } else if (slide.layout === "THREE_COLUMN") {
      await createColumnSlide(slidesApi, presentationId, slide, 3, i);
    }
  }

  return { id: presentationId, url };
}

/**
 * Create a title slide (TITLE layout)
 */
async function createTitleSlide(
  slidesApi: slides_v1.Slides,
  presentationId: string,
  slide: SlideData,
  index: number
): Promise<void> {
  const slideId = `slide_${index}`;

  // Create slide with TITLE layout
  const createRes = await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{
        createSlide: {
          objectId: slideId,
          slideLayoutReference: { predefinedLayout: LAYOUTS.TITLE },
        },
      }],
    },
  });

  // Get the actual shape IDs from the created slide
  const presData = await slidesApi.presentations.get({ presentationId });
  const createdSlide = presData.data.slides?.find(s => s.objectId === slideId);

  if (!createdSlide || !createdSlide.pageElements) return;

  const requests: Request[] = [];

  // Find title and subtitle shapes by type
  const titleShape = createdSlide.pageElements.find(
    el => el.shape?.placeholder?.type === "CENTERED_TITLE" || el.shape?.placeholder?.type === "TITLE"
  );
  const subtitleShape = createdSlide.pageElements.find(
    el => el.shape?.placeholder?.type === "SUBTITLE"
  );

  if (slide.title && titleShape?.objectId) {
    requests.push({
      insertText: {
        objectId: titleShape.objectId,
        text: slide.title,
      },
    });
  }

  if (slide.subtitle && subtitleShape?.objectId) {
    requests.push({
      insertText: {
        objectId: subtitleShape.objectId,
        text: slide.subtitle,
      },
    });
  }

  if (requests.length > 0) {
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: { requests },
    });
  }
}

/**
 * Create a title + body slide
 */
async function createTitleBodySlide(
  slidesApi: slides_v1.Slides,
  presentationId: string,
  slide: SlideData,
  index: number
): Promise<void> {
  const slideId = `slide_${index}`;

  // Create slide with TITLE_AND_BODY layout
  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{
        createSlide: {
          objectId: slideId,
          slideLayoutReference: { predefinedLayout: LAYOUTS.TITLE_BODY },
        },
      }],
    },
  });

  // Get the actual shape IDs from the created slide
  const presData = await slidesApi.presentations.get({ presentationId });
  const createdSlide = presData.data.slides?.find(s => s.objectId === slideId);

  if (!createdSlide || !createdSlide.pageElements) return;

  const requests: Request[] = [];

  // Find title and body shapes
  const titleShape = createdSlide.pageElements.find(
    el => el.shape?.placeholder?.type === "TITLE" || el.shape?.placeholder?.type === "CENTERED_TITLE"
  );
  const bodyShape = createdSlide.pageElements.find(
    el => el.shape?.placeholder?.type === "BODY"
  );

  if (slide.title && titleShape?.objectId) {
    requests.push({
      insertText: {
        objectId: titleShape.objectId,
        text: slide.title,
      },
    });
  }

  if (slide.body && bodyShape?.objectId) {
    requests.push({
      insertText: {
        objectId: bodyShape.objectId,
        text: slide.body,
      },
    });
  }

  if (requests.length > 0) {
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: { requests },
    });
  }
}

/**
 * Create a multi-column slide with title and columns
 */
async function createColumnSlide(
  slidesApi: slides_v1.Slides,
  presentationId: string,
  slide: SlideData,
  numColumns: number,
  index: number
): Promise<void> {
  const slideId = `slide_${index}`;
  const requests: Request[] = [];

  // Create blank slide
  requests.push({
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: LAYOUTS.BLANK },
    },
  });

  // Add title text box at top
  if (slide.title) {
    const titleBoxId = `${slideId}_title`;
    requests.push(
      {
        createShape: {
          objectId: titleBoxId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 650, unit: "PT" },
              height: { magnitude: 50, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 50,
              translateY: 30,
              unit: "PT",
            },
          },
        },
      },
      {
        insertText: {
          objectId: titleBoxId,
          text: slide.title,
        },
      },
      {
        updateTextStyle: {
          objectId: titleBoxId,
          style: {
            fontSize: { magnitude: 28, unit: "PT" },
            bold: true,
          },
          fields: "fontSize,bold",
        },
      }
    );
  }

  // Add columns
  if (slide.columns && slide.columns.length > 0) {
    const columns = slide.columns.slice(0, numColumns);
    const columnWidth = 650 / numColumns - 20;
    const startX = 50;
    const startY = 100;

    columns.forEach((col: Column, idx: number) => {
      const columnX = startX + idx * (columnWidth + 20);
      const columnId = `${slideId}_col_${idx}`;

      // Build column text
      let columnText = "";
      if (col.heading) {
        columnText += `${col.heading}\n\n`;
      }
      if (col.bullets && col.bullets.length > 0) {
        columnText += col.bullets.map((b) => `• ${b}`).join("\n");
      }

      requests.push(
        {
          createShape: {
            objectId: columnId,
            shapeType: "TEXT_BOX",
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: columnWidth, unit: "PT" },
                height: { magnitude: 300, unit: "PT" },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: columnX,
                translateY: startY,
                unit: "PT",
              },
            },
          },
        },
        {
          insertText: {
            objectId: columnId,
            text: columnText,
          },
        },
        {
          updateTextStyle: {
            objectId: columnId,
            style: {
              fontSize: { magnitude: 11, unit: "PT" },
            },
            fields: "fontSize",
          },
        }
      );

      // Bold the heading if it exists
      if (col.heading) {
        requests.push({
          updateTextStyle: {
            objectId: columnId,
            textRange: {
              type: "FIXED_RANGE",
              startIndex: 0,
              endIndex: col.heading.length,
            },
            style: {
              bold: true,
              fontSize: { magnitude: 14, unit: "PT" },
            },
            fields: "bold,fontSize",
          },
        });
      }
    });
  }

  // Add footer (page number)
  if (slide.footer) {
    const footerId = `${slideId}_footer`;
    requests.push(
      {
        createShape: {
          objectId: footerId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 50, unit: "PT" },
              height: { magnitude: 20, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 675,
              translateY: 500,
              unit: "PT",
            },
          },
        },
      },
      {
        insertText: {
          objectId: footerId,
          text: slide.footer,
        },
      },
      {
        updateTextStyle: {
          objectId: footerId,
          style: {
            fontSize: { magnitude: 10, unit: "PT" },
          },
          fields: "fontSize",
        },
      }
    );
  }

  // Execute all requests for this slide
  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  });
}
