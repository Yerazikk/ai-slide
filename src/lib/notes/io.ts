// src/lib/notes/io.ts
import { NotesDB, Note } from "./types";

export function serialize(db: NotesDB) {
  return JSON.stringify(db, null, 2);
}

export function parseFile(text: string): NotesDB {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.notes)) {
    throw new Error("Invalid JSON: expected { notes: [] }");
  }
  const notes: Note[] = parsed.notes.map((n: unknown) => {
    const note = n as Record<string, unknown>;
    return {
      id:
        typeof note.id === "string" && note.id.length
          ? note.id
          : (globalThis.crypto?.randomUUID?.() ??
             "nt_" + Math.random().toString(36).slice(2, 10)),
      text: typeof note.text === "string" ? note.text : "",
      updatedAt:
        typeof note.updatedAt === "string" && !Number.isNaN(Date.parse(note.updatedAt))
          ? note.updatedAt
          : new Date().toISOString(),
    };
  });
  return { notes, version: 1 };
}

export function mergeDB(current: NotesDB, incoming: NotesDB): NotesDB {
  const byId = new Map<string, Note>();
  [...current.notes, ...incoming.notes].forEach((n) => {
    const existing = byId.get(n.id);
    if (!existing) {
      byId.set(n.id, n);
    } else {
      byId.set(
        n.id,
        new Date(n.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
          ? n
          : existing
      );
    }
  });
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return { version: 1, notes: merged };
}
