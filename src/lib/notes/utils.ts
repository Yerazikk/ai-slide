// src/lib/notes/utils.ts
export const LS_KEY = "notes-db-v1";

export const nowISO = () => new Date().toISOString();

export const newId = () =>
  "nt_" + Math.random().toString(36).slice(2, 10);

export function splitTitle(text: string) {
  const [first, ...rest] = text.split("\n");
  return { title: first || "(untitled)", body: rest.join("\n") };
}
