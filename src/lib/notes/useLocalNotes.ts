"use client";

import { useEffect, useMemo, useState } from "react";
import { Note, NotesDB } from "./types";
import { loadDB, saveDB } from "./storage";
import { newId, nowISO } from "./utils";
import { mergeDB, parseFile, serialize } from "./io";

export function useLocalNotes() {
  const [db, setDb] = useState<NotesDB>({ notes: [], version: 1 });
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadDB();
    setDb(loaded);
    setActiveId(loaded.notes[0]?.id ?? null);
  }, []);

  useEffect(() => {
    saveDB(db);
  }, [db]);

  const active = useMemo(
    () => db.notes.find((n) => n.id === activeId) ?? null,
    [db.notes, activeId]
  );

  function addNote() {
    const note: Note = { id: newId(), text: "", updatedAt: nowISO() };
    setDb((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
    setActiveId(note.id);
  }

  function updateActive(text: string) {
    if (!active) return;
    setDb((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === active.id ? { ...n, text, updatedAt: nowISO() } : n
      ),
    }));
  }

  function removeNote(id: string) {
    setDb((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
    if (activeId === id) setActiveId(null);
  }

  /** Import a premade JSON file from /public/data/premade */
  async function importPremade(name: string) {
    try {
      const res = await fetch(`/data/${name}.json`);
      if (!res.ok) throw new Error(`Failed to load /data/${name}.json`);
      const text = await res.text();
      const incoming = parseFile(text);
      setDb((prev) => mergeDB(prev, incoming));
      if (!activeId && incoming.notes[0]) setActiveId(incoming.notes[0].id);
    } catch (err) {
      console.error("Error importing premade file:", err);
    }
  }

  /** Import a JSON file manually uploaded */
  async function importJSON(file: File, mode: "merge" | "replace" = "merge") {
    const text = await file.text();
    const incoming = parseFile(text);
    setDb((prev) => (mode === "replace" ? incoming : mergeDB(prev, incoming)));
    if (!activeId && incoming.notes[0]) setActiveId(incoming.notes[0].id);
  }

  function clearAllNotes() {
    setDb({ notes: [], version: 1 });
    setActiveId(null);
    }
  /** Export current notes to JSON */
  function exportJSON() {
    const blob = new Blob([serialize(db)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notes-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    db,
    activeId,
    setActiveId,
    active,
    addNote,
    updateActive,
    removeNote,
    importJSON,
    exportJSON,
    importPremade,
    clearAllNotes,
  };
}
