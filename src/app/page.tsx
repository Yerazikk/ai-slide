"use client";

import { useEffect, useState } from "react";
import { useLocalNotes } from "../lib/notes/useLocalNotes";
import NoteCard from "../components/NoteCard";
import ActiveNoteEditor from "../components/ActiveNoteEditor";

const TITLE_LS_KEY = "last-deck-title";

export default function Home() {
  const {
    db, activeId, setActiveId, active,
    addNote, updateActive, removeNote, importPremade
  } = useLocalNotes();

  const [creating, setCreating] = useState(false);
  const [deckUrl, setDeckUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>("");

  // Load last title (so it persists across refreshes)
  useEffect(() => {
    const t = localStorage.getItem(TITLE_LS_KEY);
    if (t) setProjectTitle(t);
  }, []);

  function setAndPersistTitle(t: string) {
    const clean = (t || "").trim();
    setProjectTitle(clean);
    try {
      localStorage.setItem(TITLE_LS_KEY, clean);
    } catch {}
  }

  async function makeSlides() {
    setCreating(true);
    setError(null);
    setDeckUrl(null);

    try {
      // 1) Prompt 1 - Plan & Clean: analyze notes and create outline
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: db.notes })
      });
      const plan = await planRes.json();
      if (!planRes.ok || !plan.ok) throw new Error(plan.error || "Planning failed");

      // 2) Prompt 2 - Generate Slides: convert outline to slides
      const genRes = await fetch("/api/generate", { method: "POST" });
      const gen = await genRes.json();
      if (!genRes.ok || !gen.ok) throw new Error(gen.error || "AI generation failed");

      // Pull the title from the AI preview and save it
      const titleFromAI: string = gen.preview?.title || "";
      if (titleFromAI) setAndPersistTitle(titleFromAI);

      // 3) Create deck from presentation.json
      const fillRes = await fetch("/api/fill", { method: "POST" });
      const fill = await fillRes.json();
      if (!fillRes.ok || !fill.ok) throw new Error(fill.error || "Slides fill failed");

      setDeckUrl(fill.url);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#13131A] text-white">
      {/* Top controls */}
      <section className="sticky top-0 z-10 bg-[#13131A]/95 backdrop-blur border-b border-[#28282F]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="mb-4">
             <button
               onClick={makeSlides}
               disabled={creating || db.notes.length === 0}
               className="w-full px-8 py-6 rounded-xl bg-gradient-to-br from-[#606065] to-[#28282F] text-white text-3xl font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
             >
              {creating ? "MUSE" : "MUSE"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addNote}
              className="px-4 py-3 rounded-xl bg-[#28282F] text-white border border-[#606065] hover:bg-[#606065]/20 transition-colors"
              title="Add note"
            >
              Open Notebook
            </button>

            {/* Tiny premade import (optional) */}
            <button
              onClick={() => importPremade("muse_example")}
              className="px-2 py-1 text-xs rounded bg-[#11131C] text-[#606065] border border-[#28282F] hover:text-[#AAB4E9] transition-colors"
              title="import premade notes"
            >
              Import Example Notes
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-3">
          {deckUrl ? (
            <div className="flex items-center gap-2">
               <a className="text-[#AAB4E9] underline text-2xl font-medium hover:text-[#AAB4E9]/80 transition-colors" href={deckUrl} target="_blank" rel="noreferrer">
                 Open {projectTitle ? `"${projectTitle}"` : "your"} slides
               </a>
              {/* small, faint title echo */}
              {!projectTitle ? null : (
                <span className="text-xs text-[#606065]">(title detected by AI)</span>
              )}
            </div>
          ) : (
            <div className="text-[#606065]">
              Muse builds while you sleep... {projectTitle ? ` — latest title: "${projectTitle}"` : ""}
            </div>
          )}
          {error && <div className="text-red-400 mt-1">{error}</div>}
        </div>
      </section>

      {/* Bottom: notes area */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        {/* Active editor */}
        {active && (
          <div className="mb-6">
            <ActiveNoteEditor
              value={active.text}
              onChange={updateActive}
              onDelete={() => removeNote(active.id)}
            />
          </div>
        )}

        {/* Notes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {db.notes.map((n) => (
            <NoteCard
              key={n.id}
              text={n.text}
              active={n.id === activeId}
              onClick={() => setActiveId(n.id)}
            />
          ))}
          {db.notes.length === 0 && (
            <div className="text-[#606065]">No notes yet. Click "add note".</div>
          )}
        </div>
      </section>
    </main>
  );
}
