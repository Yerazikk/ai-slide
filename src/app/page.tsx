"use client";
import { useState } from "react";

export default function Home() {
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const go = async () => {
    setCreating(true);
    setUrl(null);
    const res = await fetch("/api/create-hello", { method: "POST" });
    const json = await res.json();
    setCreating(false);
    if (json.ok) setUrl(json.url);
    else alert(`Error: ${json.error}`);
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Phase 0: Google Slides wiring</h1>
      <button
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        onClick={go}
        disabled={creating}
      >
        {creating ? "Creating..." : "Create Hello Deck"}
      </button>
      {url && (
        <p className="mt-4">
          Done!{" "}
          <a className="underline" href={url} target="_blank" rel="noreferrer">
            Open in Google Slides
          </a>
        </p>
      )}
    </main>
  );
}
