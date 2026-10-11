/**
 * Logo upload with drag-and-drop, preview, and validation feedback.
 * Controlled entirely via props from useRegistration (setLogo, preview,
 * error) — no local file state here.
 */

import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export default function ImageUploader({ preview, onFileSelect, onRemove, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        Store Logo (optional)
      </label>

      {preview ? (
        <div className="relative w-32 h-32">
          <img src={preview} alt="Logo preview" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600"
            aria-label="Remove logo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`w-32 h-32 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            dragging ? "border-[#0B1E4A] bg-[#0B1E4A]/5" : "border-slate-300 hover:border-slate-400"
          }`}
        >
          {dragging ? <Upload size={22} className="text-[#0B1E4A]" /> : <ImageIcon size={22} className="text-slate-400" />}
          <span className="text-xs text-slate-400 text-center px-2">Click or drag to upload</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
      <p className="text-xs text-slate-400 mt-1">PNG, JPEG or WebP, max 5MB.</p>
    </div>
  );
}