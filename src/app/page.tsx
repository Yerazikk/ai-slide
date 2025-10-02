"use client";

import { useEffect, useState } from "react";
import { useLocalNotes } from "../lib/notes/useLocalNotes";
import NoteCard from "../components/NoteCard";
import ActiveNoteEditor from "../components/ActiveNoteEditor";
import { useGoogleAuth } from "../lib/useGoogleAuth";

const TITLE_LS_KEY = "last-deck-title";

export default function Home() {
  const {
    db, activeId, setActiveId, active,
    addNote, updateActive, removeNote, importPremade
  } = useLocalNotes();

  const { accessToken, isLoading, isSignedIn, signIn } = useGoogleAuth();

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
    if (!isSignedIn) {
      signIn();
      return;
    }

    setCreating(true);
    setError(null);
    setDeckUrl(null);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // 1) Prompt 1 - Plan & Clean: analyze notes and create outline
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers,
        body: JSON.stringify({ notes: db.notes })
      });
      const plan = await planRes.json();
      if (!planRes.ok || !plan.ok) throw new Error(plan.error || "Planning failed");

      // 2) Prompt 2 - Generate Slides: convert outline to slides
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers,
      });
      const gen = await genRes.json();
      if (!genRes.ok || !gen.ok) throw new Error(gen.error || "AI generation failed");

      // Pull the title from the AI preview and save it
      const titleFromAI: string = gen.preview?.title || "";
      if (titleFromAI) setAndPersistTitle(titleFromAI);

      // 3) Create deck from presentation.json
      const fillRes = await fetch("/api/fill", {
        method: "POST",
        headers,
      });
      const fill = await fillRes.json();
      if (!fillRes.ok || !fill.ok) throw new Error(fill.error || "Slides fill failed");

      setDeckUrl(fill.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  // Show login gate if not signed in
  if (!isLoading && !isSignedIn) {
    return (
      <main className="flex h-screen bg-[#13131A] text-white items-center justify-center">
        <div className="text-center max-w-md p-8 rounded-2xl border border-[#28282F] bg-gradient-to-br from-[#21292D] to-[#11131C]">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-[#AAB4E9] to-[#606065] bg-clip-text text-transparent mb-6">
            MUSE
          </h1>
          <p className="text-[#606065] mb-8">
            Must use use-muse account
          </p>
          <button
            onClick={signIn}
            className="px-8 py-4 rounded-xl bg-gradient-to-br from-[#606065] to-[#28282F] text-white text-lg font-semibold hover:opacity-90 transition-opacity border border-[#AAB4E9]"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-[#13131A] text-white overflow-hidden">
      {/* Left sidebar - Notes */}
      <aside className="w-80 border-r border-[#28282F] flex flex-col">
        {/* Sidebar header */}
        <div className="p-4 pt-8 border-b border-[#28282F] space-y-3">
          <button
            onClick={() => importPremade("muse_example")}
            className="w-full px-2 py-1.5 text-xs rounded bg-[#11131C] text-[#606065] border border-[#28282F] hover:text-[#AAB4E9] transition-colors"
            title="import premade notes"
          >
            Import Example Notes
          </button>

          <button
            onClick={addNote}
            className="w-full px-4 py-3 rounded-xl bg-[#28282F] text-white border border-[#606065] hover:bg-[#606065]/20 transition-colors text-2xl font-bold"
            title="Add note"
          >
            +
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
            <div className="text-[#606065] text-sm">No notes yet. Click &ldquo;Open Notebook&rdquo;.</div>
          )}
        </div>
      </aside>

      {/* Right side - Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top controls */}
        <section className="border-b border-[#28282F] bg-[#13131A]">
          <div className="px-6 py-4 pt-8">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-[#AAB4E9] to-[#606065] bg-clip-text text-transparent mb-6 text-center">
              MUSE
            </h1>
            <div className="mb-4">
              <button
                onClick={makeSlides}
                disabled={creating || db.notes.length === 0}
                className="px-6 py-2 rounded-lg bg-transparent text-sm font-semibold transition-colors border-2 border-[#AAB4E9] text-[#AAB4E9] hover:bg-[#AAB4E9]/10 disabled:opacity-40"
              >
                {creating ? "Creating..." : isSignedIn ? "Create Slides" : "Sign in to Create Slides"}
              </button>
            </div>

            <div className="space-y-2">
              {deckUrl ? (
                <div className="flex items-center gap-2">
                  <a className="text-[#AAB4E9] underline text-2xl font-medium hover:text-[#AAB4E9]/80 transition-colors" href={deckUrl} target="_blank" rel="noreferrer">
                    Open {projectTitle ? `"${projectTitle}"` : "your"} slides
                  </a>
                </div>
              ) : (
                <div className="text-[#606065]">
                  Slide link shows up here!
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
