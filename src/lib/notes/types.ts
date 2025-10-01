export type Note = { id: string; text: string; updatedAt: string };
export type NotesDB = { notes: Note[]; version: number };
