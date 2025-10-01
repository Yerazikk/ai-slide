// Slide layout types
export type SlideLayout =
  | "TITLE"           // Title slide with title + subtitle
  | "TITLE_BODY"      // Title + body text
  | "ONE_COLUMN"      // Title + single column with bullets
  | "TWO_COLUMN"      // Title + 2 columns with bullets
  | "THREE_COLUMN";   // Title + 3 columns with bullets

// Column data for multi-column layouts
export interface Column {
  heading?: string;   // Column heading
  bullets: string[];  // Bullet points (max 3)
}

// Generic slide data structure
export interface SlideData {
  layout: SlideLayout;
  title?: string;
  subtitle?: string;
  body?: string;      // For TITLE_BODY layout
  columns?: Column[]; // For column layouts
  footer?: string;    // Page number or footer
}

// Presentation structure
export interface PresentationStructure {
  title: string;      // Deck title
  slides: SlideData[];
}