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
    <main className="flex h-screen bg-[#13131A] text-white overflow-hidden">
      {/* Left sidebar - Notes */}
      <aside className="w-80 border-r border-[#28282F] flex flex-col">
        {/* Sidebar header */}
        <div className="p-4 border-b border-[#28282F] space-y-3">
          <button
            onClick={addNote}
            className="w-full px-4 py-3 rounded-xl bg-[#28282F] text-white border border-[#606065] hover:bg-[#606065]/20 transition-colors text-2xl font-bold"
            title="Add note"
          >
            +
          </button>

          <button
            onClick={() => importPremade("muse_example")}
            className="w-full px-2 py-1.5 text-xs rounded bg-[#11131C] text-[#606065] border border-[#28282F] hover:text-[#AAB4E9] transition-colors"
            title="import premade notes"
          >
            Import Example Notes
          </button>
        </div>

        {/* Scrollable notes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {db.notes.map((n) => (
            <NoteCard
              key={n.id}
              text={n.text}
              active={n.id === activeId}
              onClick={() => setActiveId(n.id)}
              onDelete={() => removeNote(n.id)}
            />
          ))}
          {db.notes.length === 0 && (
            <div className="text-[#606065] text-sm">No notes yet. Click "Open Notebook".</div>
          )}
        </div>
      </aside>

      {/* Right side - Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top controls */}
        <section className="border-b border-[#28282F] bg-[#13131A]">
          <div className="px-6 py-4">
            <div className="mb-4">
              <button
                onClick={makeSlides}
                disabled={creating || db.notes.length === 0}
                className="w-full text-center text-5xl font-bold bg-gradient-to-r from-[#AAB4E9] to-[#606065] bg-clip-text text-transparent hover:from-[#C5CDFF] hover:to-[#AAB4E9] disabled:opacity-40 transition-all cursor-pointer py-2"
              >
                {creating ? "MUSE" : "MUSE"}
              </button>
            </div>

            <div className="space-y-2">
              {deckUrl ? (
                <div className="flex items-center gap-2">
                  <a className="text-[#AAB4E9] underline text-2xl font-medium hover:text-[#AAB4E9]/80 transition-colors" href={deckUrl} target="_blank" rel="noreferrer">
                    Open {projectTitle ? `"${projectTitle}"` : "your"} slides
                  </a>
                  {projectTitle && (
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
          </div>
        </section>

        {/* Main editor area */}
        <section className="flex-1 p-6 overflow-hidden">
          {active ? (
            <ActiveNoteEditor
              value={active.text}
              onChange={updateActive}
              onDelete={() => removeNote(active.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#606065]">
              Select a note from the sidebar to edit
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
