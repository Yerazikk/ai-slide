"use client";
import { splitTitle } from "../lib/notes/utils";
import { useState } from "react";

export default function NoteCard({
  text, active, onClick, onDelete
}: { text: string; active?: boolean; onClick?: () => void; onDelete?: () => void }) {
  const { title, body } = splitTitle(text);
  const [isHovered, setIsHovered] = useState(false);
  const displayTitle = title || "New note";
  const isPlaceholder = !title;

  // Only show hover expansion if there's enough content to warrant it
  const hasExpandableContent = body && body.length > 50;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-full p-3 rounded-lg border transition-all text-left
          flex flex-col
          ${active
            ? "border-[#AAB4E9] bg-gradient-to-br from-[#0B1018] to-[#111826] ring-2 ring-[#AAB4E9]/30"
            : "border-[#28282F] bg-[#21292D] hover:bg-[#28282F] hover:border-[#606065]"}
          ${isHovered && hasExpandableContent ? "invisible" : ""}
        `}
      >
        <div className={`font-semibold text-sm mb-1 break-words transition-all ${isHovered && hasExpandableContent ? "line-clamp-none" : "line-clamp-2"} ${isPlaceholder ? "text-[#606065] italic" : "text-white"}`}>
          {displayTitle}
        </div>
        {body ? (
          <div className={`text-xs text-white/60 whitespace-pre-wrap break-words transition-all ${isHovered && hasExpandableContent ? "line-clamp-none" : "line-clamp-2"}`}>
            {body}
          </div>
        ) : (
          <div className="text-xs text-[#606065]">(no body)</div>
        )}
      </button>

      {/* Expanded overlay on hover */}
      {isHovered && hasExpandableContent && (
        <div
          onClick={onClick}
          className="absolute left-0 right-0 top-0 z-50 p-3 rounded-lg border shadow-2xl
          border-[#AAB4E9] bg-[#1A1F2E] cursor-pointer">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className={`font-semibold text-sm break-words flex-1 ${isPlaceholder ? "text-[#606065] italic" : "text-white"}`}>
              {displayTitle}
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex-shrink-0 p-1 rounded hover:bg-red-900/30 transition-colors text-red-400 hover:text-red-300"
                title="Delete note"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          {body ? (
            <div className="text-xs text-white/80 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
              {body}
            </div>
          ) : (
            <div className="text-xs text-[#606065]">(no body)</div>
          )}
        </div>
      )}
    </div>
  );
}
