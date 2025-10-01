"use client";

export default function ActiveNoteEditor({
  value, onChange, onDelete
}: { value: string; onChange: (v: string) => void; onDelete: () => void }) {
  return (
    <div className="rounded-2xl border border-[#28282F] bg-gradient-to-br from-[#21292D] to-[#11131C] overflow-hidden">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full min-h-[10rem] p-4 outline-none bg-[#28282F] text-white placeholder:text-[#606065] align-top whitespace-pre-wrap break-words focus:ring-1 focus:ring-[#AAB4E9] transition-shadow"
        placeholder={"Title on the first line\nThen the rest of your note…"}
        />

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
