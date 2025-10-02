// import { google } from "googleapis";
import type { slides_v1 } from "googleapis";
import { SlideData, Column } from "./types";
import fs from "fs";
import path from "path";

type Request = slides_v1.Schema$Request;

// Theme configuration
const THEME = {
  background: "#13131A",
  text: "#FFFFFF",
  highlight: "#AAB4E9",
  accent: "#606065",
  accentGradient: "#28282F",
  font: "Inter",
  fontSize: {
    coverTitle: 32,      // First slide title
    coverSubtitle: 16,   // First slide subtitle/tagline
    title: 25,           // Regular slide titles
    subtitle: 12,        // Column headings
    bullet: 10,          // Bullet points
    small: 10,           // Small text (footers)
  },
  margin: {
    top: 72,             // 1 inch top margin
    side: 36,            // 0.5 inch side margins
  },
} as const;

// Layout constants (using predefined Google Slides layouts)
const LAYOUTS = {
  TITLE: "TITLE",
  TITLE_BODY: "TITLE_AND_BODY",
  BLANK: "BLANK",
} as const;

// Helper to convert hex to RGB
function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { red: 1, green: 1, blue: 1 };
  return {
    red: parseInt(result[1], 16) / 255,
    green: parseInt(result[2], 16) / 255,
    blue: parseInt(result[3], 16) / 255,
  };
}

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

  // 2) Get the default slide ID that was created
  const initialPres = await slidesApi.presentations.get({ presentationId });
  const defaultSlideId = initialPres.data.slides?.[0]?.objectId;

  // 3) Set background image URL (provide your hosted image URL here)
  const backgroundImageUrl = process.env.BACKGROUND_IMAGE_URL || null;

  // 4) Build slides one by one (can't batch because we need slide IDs)
  for (let i = 0; i < slideData.length; i++) {
    const slide = slideData[i];

    // Create slide with appropriate layout
    if (slide.layout === "TITLE") {
      await createTitleSlide(slidesApi, presentationId, slide, i, backgroundImageUrl);
    } else if (slide.layout === "TITLE_BODY") {
      await createTitleBodySlide(slidesApi, presentationId, slide, i, backgroundImageUrl);
    } else if (slide.layout === "ONE_COLUMN") {
      await createColumnSlide(slidesApi, presentationId, slide, 1, i, backgroundImageUrl);
    } else if (slide.layout === "TWO_COLUMN") {
      await createColumnSlide(slidesApi, presentationId, slide, 2, i, backgroundImageUrl);
    } else if (slide.layout === "THREE_COLUMN") {
      await createColumnSlide(slidesApi, presentationId, slide, 3, i, backgroundImageUrl);
    }
  }

  // 4) Delete the default empty slide that was created
  if (defaultSlideId) {
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: [
          {
            deleteObject: {
              objectId: defaultSlideId,
            },
          },
        ],
      },
    });
  }

  return { id: presentationId, url };
}

/**
 * Upload background image and get its URL (currently unused)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function uploadBackgroundImage(
  slidesApi: slides_v1.Slides,
  presentationId: string
): Promise<string | null> {
  try {
    // Read the background image
    const imagePath = path.join(process.cwd(), "public", "darkbackgroundtemplate.jpg");
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // Create a temporary image on a slide to get the URL
    const tempSlideId = "temp_image_slide";
    const tempImageId = "temp_image";

    // Create temp slide with image
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: [
          {
            createSlide: {
              objectId: tempSlideId,
            },
          },
          {
            createImage: {
              objectId: tempImageId,
              url: `data:image/jpeg;base64,${base64Image}`,
              elementProperties: {
                pageObjectId: tempSlideId,
                size: {
                  width: { magnitude: 1, unit: "PT" },
                  height: { magnitude: 1, unit: "PT" },
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: 0,
                  translateY: 0,
                  unit: "PT",
                },
              },
            },
          },
        ],
      },
    });

    // Get the uploaded image URL
    const pres = await slidesApi.presentations.get({ presentationId });
    const tempSlide = pres.data.slides?.find((s) => s.objectId === tempSlideId);
    const imageElement = tempSlide?.pageElements?.find((e) => e.objectId === tempImageId);
    const imageUrl = imageElement?.image?.contentUrl;

    // Delete temp slide
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: [
          {
            deleteObject: {
              objectId: tempSlideId,
            },
          },
        ],
      },
    });

    return imageUrl || null;
  } catch (error) {
    console.error("Failed to upload background image:", error);
    return null;
  }
}

/**
 * Apply theme background to a specific slide
 */
function getBackgroundRequest(slideId: string, imageUrl?: string): Request {
  if (imageUrl) {
    return {
      updatePageProperties: {
        objectId: slideId,
        pageProperties: {
          pageBackgroundFill: {
            stretchedPictureFill: {
              contentUrl: imageUrl,
              size: {
                width: { magnitude: 720, unit: "PT" },
                height: { magnitude: 540, unit: "PT" },
              },
            },
          },
        },
        fields: "pageBackgroundFill",
      },
    };
  }

  // Fallback to solid color
  const bgColor = hexToRgb(THEME.background);
  return {
    updatePageProperties: {
      objectId: slideId,
      pageProperties: {
        pageBackgroundFill: {
          solidFill: {
            color: {
              rgbColor: bgColor,
            },
          },
        },
      },
      fields: "pageBackgroundFill",
    },
  };
}

/**
 * Create a title slide (TITLE layout)
 */
async function createTitleSlide(
  slidesApi: slides_v1.Slides,
  presentationId: string,
  slide: SlideData,
  index: number,
  backgroundImageUrl?: string | null
): Promise<void> {
  const slideId = `slide_${index}`;

  // Create slide with TITLE layout
  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        {
          createSlide: {
            objectId: slideId,
            slideLayoutReference: { predefinedLayout: LAYOUTS.TITLE },
          },
        },
        getBackgroundRequest(slideId, backgroundImageUrl || undefined),
      ],
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

  const textColor = hexToRgb(THEME.text);

  if (slide.title && titleShape?.objectId) {
    requests.push(
      {
        insertText: {
          objectId: titleShape.objectId,
          text: slide.title,
        },
      },
      {
        updateTextStyle: {
          objectId: titleShape.objectId,
          style: {
            fontSize: { magnitude: THEME.fontSize.coverTitle, unit: "PT" },
            foregroundColor: { opaqueColor: { rgbColor: textColor } },
            fontFamily: THEME.font,
            bold: true,
          },
          fields: "fontSize,foregroundColor,fontFamily,bold",
        },
      },
      {
        updateParagraphStyle: {
          objectId: titleShape.objectId,
          style: {
            alignment: "CENTER",
          },
          fields: "alignment",
        },
      }
    );
  }

  if (slide.subtitle && subtitleShape?.objectId) {
    requests.push(
      {
        insertText: {
          objectId: subtitleShape.objectId,
          text: slide.subtitle,
        },
      },
      {
        updateTextStyle: {
          objectId: subtitleShape.objectId,
          style: {
            fontSize: { magnitude: THEME.fontSize.coverSubtitle, unit: "PT" },
            foregroundColor: { opaqueColor: { rgbColor: textColor } },
            fontFamily: THEME.font,
            bold: false,
          },
          fields: "fontSize,foregroundColor,fontFamily,bold",
        },
      },
      {
        updateParagraphStyle: {
          objectId: subtitleShape.objectId,
          style: {
            alignment: "CENTER",
          },
          fields: "alignment",
        },
      }
    );
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
  index: number,
  backgroundImageUrl?: string | null
): Promise<void> {
  const slideId = `slide_${index}`;
  const requests: Request[] = [];
  const textColor = hexToRgb(THEME.text);

  // Create blank slide for quote
  requests.push(
    {
      createSlide: {
        objectId: slideId,
        slideLayoutReference: { predefinedLayout: LAYOUTS.BLANK },
      },
    },
    getBackgroundRequest(slideId, backgroundImageUrl || undefined)
  );

  // Add large quote text box, left-aligned and vertically centered
  if (slide.body) {
    const quoteBoxId = `${slideId}_quote`;
    const slideWidth = 720;
    const quoteWidth = slideWidth - (THEME.margin.side * 2);
    const quoteX = THEME.margin.side;
    const quoteY = 200; // Vertically centered area

    requests.push(
      {
        createShape: {
          objectId: quoteBoxId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: quoteWidth, unit: "PT" },
              height: { magnitude: 300, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: quoteX,
              translateY: quoteY,
              unit: "PT",
            },
          },
        },
      },
      {
        insertText: {
          objectId: quoteBoxId,
          text: slide.body,
        },
      },
      {
        updateTextStyle: {
          objectId: quoteBoxId,
          style: {
            fontSize: { magnitude: 36, unit: "PT" },
            foregroundColor: { opaqueColor: { rgbColor: textColor } },
            fontFamily: THEME.font,
            bold: true,
          },
          fields: "fontSize,foregroundColor,fontFamily,bold",
        },
      },
      {
        updateParagraphStyle: {
          objectId: quoteBoxId,
          style: {
            alignment: "START",
          },
          fields: "alignment",
        },
      }
    );
  }

  // Add page number (skip first slide)
  if (index > 0) {
    const pageNumberId = `${slideId}_page_number`;
    const slideWidth = 720;
    const pageNumX = slideWidth - THEME.margin.side - 30; // Right margin minus box width
    const pageNumY = 510; // Bottom of slide

    requests.push(
      {
        createShape: {
          objectId: pageNumberId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 30, unit: "PT" },
              height: { magnitude: 20, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: pageNumX,
              translateY: pageNumY,
              unit: "PT",
            },
          },
        },
      },
      {
        insertText: {
          objectId: pageNumberId,
          text: index.toString(),
        },
      },
      {
        updateTextStyle: {
          objectId: pageNumberId,
          style: {
            fontSize: { magnitude: 8, unit: "PT" },
            foregroundColor: { opaqueColor: { rgbColor: hexToRgb(THEME.text) } },
            fontFamily: THEME.font,
          },
          fields: "fontSize,foregroundColor,fontFamily",
        },
      },
      {
        updateParagraphStyle: {
          objectId: pageNumberId,
          style: {
            alignment: "END",
          },
          fields: "alignment",
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

/**
 * Create a multi-column slide with title and columns
 */
async function createColumnSlide(
  slidesApi: slides_v1.Slides,
  presentationId: string,
  slide: SlideData,
  numColumns: number,
  index: number,
  backgroundImageUrl?: string | null
): Promise<void> {
  const slideId = `slide_${index}`;
  const requests: Request[] = [];
  const textColor = hexToRgb(THEME.text);

  // Create blank slide
  requests.push(
    {
      createSlide: {
        objectId: slideId,
        slideLayoutReference: { predefinedLayout: LAYOUTS.BLANK },
      },
    },
    getBackgroundRequest(slideId, backgroundImageUrl || undefined)
  );

  // Add title text box at top
  if (slide.title) {
    const titleBoxId = `${slideId}_title`;
    const slideWidth = 720; // Standard slide width in PT
    const titleWidth = slideWidth - (THEME.margin.side * 2);
    const titleX = THEME.margin.side;

    requests.push(
      {
        createShape: {
          objectId: titleBoxId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: titleWidth, unit: "PT" },
              height: { magnitude: 50, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: titleX,
              translateY: THEME.margin.top,
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
            fontSize: { magnitude: THEME.fontSize.title, unit: "PT" },
            foregroundColor: { opaqueColor: { rgbColor: textColor } },
            fontFamily: THEME.font,
            bold: true,
          },
          fields: "fontSize,foregroundColor,fontFamily,bold",
        },
      },
      {
        updateParagraphStyle: {
          objectId: titleBoxId,
          style: {
            alignment: "CENTER",
          },
          fields: "alignment",
        },
      }
    );
  }

  // Add columns
  if (slide.columns && slide.columns.length > 0) {
    const columns = slide.columns.slice(0, numColumns);
    const slideWidth = 720; // Standard slide width in PT
    const contentWidth = slideWidth - (THEME.margin.side * 2); // Width minus side margins
    const columnGap = 8; // Reduced from 20 to 8 (60% reduction)

    // Calculate column width based on 3-column layout (fixed width for all)
    const maxColumns = 3;
    const fixedColumnWidth = (contentWidth - columnGap * (maxColumns - 1)) / maxColumns;

    // Calculate total width needed for actual number of columns
    const totalColumnsWidth = fixedColumnWidth * numColumns + columnGap * (numColumns - 1);

    // Center the columns horizontally
    const startX = THEME.margin.side + (contentWidth - totalColumnsWidth) / 2;
    const startY = THEME.margin.top + 60; // Below title with some spacing

    columns.forEach((col: Column, idx: number) => {
      const columnX = startX + idx * (fixedColumnWidth + columnGap);

      // Create separate heading text box if heading exists
      if (col.heading) {
        const headingId = `${slideId}_col_${idx}_heading`;
        requests.push(
          {
            createShape: {
              objectId: headingId,
              shapeType: "TEXT_BOX",
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: { magnitude: fixedColumnWidth, unit: "PT" },
                  height: { magnitude: 30, unit: "PT" },
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
              objectId: headingId,
              text: col.heading,
            },
          },
          {
            updateTextStyle: {
              objectId: headingId,
              style: {
                fontSize: { magnitude: THEME.fontSize.subtitle, unit: "PT" },
                foregroundColor: { opaqueColor: { rgbColor: textColor } },
                fontFamily: THEME.font,
                bold: true,
              },
              fields: "fontSize,foregroundColor,fontFamily,bold",
            },
          },
          {
            updateParagraphStyle: {
              objectId: headingId,
              style: {
                alignment: "START",
              },
              fields: "alignment",
            },
          }
        );
      }

      // Create bullets text box
      const columnId = `${slideId}_col_${idx}`;
      const bulletsStartY = col.heading ? startY + 40 : startY;

      // Build column text without bullet points
      let columnText = "";
      if (col.bullets && col.bullets.length > 0) {
        columnText = col.bullets.join("\n\n");
      }

      if (columnText) {
        requests.push(
          {
            createShape: {
              objectId: columnId,
              shapeType: "TEXT_BOX",
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: { magnitude: fixedColumnWidth, unit: "PT" },
                  height: { magnitude: 300, unit: "PT" },
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: columnX,
                  translateY: bulletsStartY,
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
                fontSize: { magnitude: THEME.fontSize.bullet, unit: "PT" },
                foregroundColor: { opaqueColor: { rgbColor: textColor } },
                fontFamily: THEME.font,
              },
              fields: "fontSize,foregroundColor,fontFamily",
            },
          },
          {
            updateParagraphStyle: {
              objectId: columnId,
              style: {
                alignment: "START",
              },
              fields: "alignment",
            },
          }
        );
      }
    });
  }

  // Add page number (skip first slide)
  if (index > 0) {
    const pageNumberId = `${slideId}_page_number`;
    const slideWidth = 720;
    const pageNumX = slideWidth - THEME.margin.side - 30; // Right margin minus box width
    const pageNumY = 510; // Bottom of slide

    requests.push(
      {
        createShape: {
          objectId: pageNumberId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 30, unit: "PT" },
              height: { magnitude: 20, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: pageNumX,
              translateY: pageNumY,
              unit: "PT",
            },
          },
        },
      },
      {
        insertText: {
          objectId: pageNumberId,
          text: index.toString(),
        },
      },
      {
        updateTextStyle: {
          objectId: pageNumberId,
          style: {
            fontSize: { magnitude: 8, unit: "PT" },
            foregroundColor: { opaqueColor: { rgbColor: hexToRgb(THEME.text) } },
            fontFamily: THEME.font,
          },
          fields: "fontSize,foregroundColor,fontFamily",
        },
      },
      {
        updateParagraphStyle: {
          objectId: pageNumberId,
          style: {
            alignment: "END",
          },
          fields: "alignment",
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
