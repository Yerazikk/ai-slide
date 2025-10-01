import { NotesDB } from "./types";
import { LS_KEY } from "./utils";

export function loadDB(): NotesDB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { notes: [], version: 1 };
    const parsed = JSON.parse(raw) as NotesDB;
    return { version: 1, notes: parsed.notes ?? [] };
  } catch {
    return { notes: [], version: 1 };
  }
}

export function saveDB(db: NotesDB) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}
