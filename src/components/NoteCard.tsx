"use client";
import { splitTitle } from "../lib/notes/utils";

export default function NoteCard({
  text, active, onClick
}: { text: string; active?: boolean; onClick?: () => void }) {
  const { title, body } = splitTitle(text);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border transition-all duration-300 ease-in-out text-left
        flex flex-col items-start
        overflow-hidden
        ${active
          ? "border-[#AAB4E9] bg-gradient-to-br from-[#0B1018] to-[#111826] ring-2 ring-[#AAB4E9]/30"
          : "border-[#28282F] bg-[#21292D] hover:bg-[#28282F] hover:border-[#606065]"}
        h-40 hover:h-64`}
    >
      <div className="font-semibold mb-1 text-white break-words line-clamp-1">
        {title}
      </div>
      {body ? (
        <div className="text-sm text-white/80 whitespace-pre-wrap break-words line-clamp-5">
          {body}
        </div>
      ) : (
        <div className="text-sm text-[#606065]">(no body)</div>
      )}
    </button>
  );
}
