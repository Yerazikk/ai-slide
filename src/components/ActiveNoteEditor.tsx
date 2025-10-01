"use client";
import { useEffect, useRef } from "react";

export default function ActiveNoteEditor({
  value, onChange, onDelete
}: { value: string; onChange: (v: string) => void; onDelete: () => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const lines = value.split('\n');
  const title = lines[0] || '';
  const body = lines.slice(1).join('\n');

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.setSelectionRange(
        titleRef.current.value.length,
        titleRef.current.value.length
      );
    }
  }, [value]);

  function handleTitleChange(newTitle: string) {
    onChange(newTitle + '\n' + body);
  }

  function handleBodyChange(newBody: string) {
    onChange(title + '\n' + newBody);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border border-[#28282F] bg-gradient-to-br from-[#21292D] to-[#11131C] overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          className="w-full px-6 py-4 outline-none bg-[#28282F] text-white placeholder:text-[#606065] text-2xl font-bold focus:ring-1 focus:ring-[#AAB4E9] transition-shadow border-b border-[#28282F]"
          placeholder="Title"
        />
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => handleBodyChange(e.target.value)}
          className="flex-1 w-full p-6 outline-none bg-[#28282F] text-white placeholder:text-[#606065] align-top whitespace-pre-wrap break-words resize-none focus:ring-1 focus:ring-[#AAB4E9] transition-shadow"
          placeholder="Start writing your note..."
        />
      </div>

      <div className="flex justify-end gap-2 p-2 border-t border-[#28282F] bg-[#11131C]">
        <button
          onClick={onDelete}
          className="px-3 py-1.5 rounded border text-red-300 border-red-800 hover:bg-red-900/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
