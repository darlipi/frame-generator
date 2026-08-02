"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, ZoomIn, RotateCw, Download, RefreshCcw } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import { readFileAsDataURL } from "@/lib/canvasUtils";

/**
 * ---------------------------------------------------------------------------
 * Controls
 * ---------------------------------------------------------------------------
 * The "UI/UX Agent". A single, mobile-first panel for every user-facing
 * action: upload a photo, adjust zoom/rotation, edit each dynamic text
 * field defined by the active template, and trigger the download.
 *
 * This component never touches fabric.Canvas directly — it only reads/writes
 * the Zustand store and dispatches a DOM event for "download", keeping the
 * rendering engine (CanvasEditor) fully decoupled from the controls' markup.
 */

export default function Controls() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const template = useEditorStore((s) => s.template);
  const photoDataUrl = useEditorStore((s) => s.photoDataUrl);
  const photoTransform = useEditorStore((s) => s.photoTransform);
  const textValues = useEditorStore((s) => s.textValues);
  const isExporting = useEditorStore((s) => s.isExporting);
  const isCanvasReady = useEditorStore((s) => s.isCanvasReady);

  const setPhoto = useEditorStore((s) => s.setPhoto);
  const setPhotoTransform = useEditorStore((s) => s.setPhotoTransform);
  const resetPhotoTransform = useEditorStore((s) => s.resetPhotoTransform);
  const setTextValue = useEditorStore((s) => s.setTextValue);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadError(null);
      try {
        const dataUrl = await readFileAsDataURL(file);
        setPhoto(dataUrl);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "No se pudo cargar la foto."
        );
      } finally {
        // Allow re-selecting the same file later.
        e.target.value = "";
      }
    },
    [setPhoto]
  );

  const handleDownloadClick = () => {
    window.dispatchEvent(new CustomEvent("frame-generator:download"));
  };

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-6 font-body text-paper">
      {/* --- Upload --- */}
      <section className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-paper/50">
          01 · Tu foto
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="photo-upload"
        />
        <label
          htmlFor="photo-upload"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-frame border border-dashed border-white/20 bg-ink-800 px-4 py-4 text-sm font-medium text-paper/90 transition-colors hover:border-cobalt-400 hover:text-white active:bg-ink-700"
        >
          <Upload size={18} strokeWidth={2} />
          {photoDataUrl ? "Cambiar foto" : "Subir foto"}
        </label>
        {uploadError && (
          <p className="font-mono text-xs text-safelight">{uploadError}</p>
        )}
      </section>

      {/* --- Zoom / rotate (also available via pinch/drag on the canvas) --- */}
      <section
        className={`flex flex-col gap-4 transition-opacity ${
          photoDataUrl ? "opacity-100" : "pointer-events-none opacity-30"
        }`}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-paper/50">
          02 · Ajustar
        </span>

        <label className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-sm text-paper/80">
            <ZoomIn size={16} /> Zoom
          </span>
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.01}
            value={photoTransform.scale}
            onChange={(e) =>
              setPhotoTransform({ scale: parseFloat(e.target.value) })
            }
            className="accent-cobalt"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-sm text-paper/80">
            <RotateCw size={16} /> Rotación
          </span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={photoTransform.rotation}
            onChange={(e) =>
              setPhotoTransform({ rotation: parseFloat(e.target.value) })
            }
            className="accent-cobalt"
          />
        </label>

        <button
          type="button"
          onClick={resetPhotoTransform}
          className="flex items-center justify-center gap-2 self-start rounded-frame px-3 py-1.5 font-mono text-xs text-paper/60 transition-colors hover:text-white"
        >
          <RefreshCcw size={14} /> restablecer posición
        </button>
      </section>

      {/* --- Dynamic text fields, driven entirely by the active template --- */}
      <section className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-paper/50">
          03 · Texto
        </span>
        {template.textLayers.map((layer) => (
          <label key={layer.id} className="flex flex-col gap-1.5">
            <span className="text-sm text-paper/80">{layer.label}</span>
            <input
              type="text"
              value={textValues[layer.id] ?? ""}
              maxLength={40}
              onChange={(e) => setTextValue(layer.id, e.target.value)}
              className="rounded-frame border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-cobalt-400 focus:ring-1 focus:ring-cobalt-400"
            />
          </label>
        ))}
      </section>

      {/* --- Download --- */}
      <button
        type="button"
        onClick={handleDownloadClick}
        disabled={!photoDataUrl || !isCanvasReady || isExporting}
        className="mt-2 flex items-center justify-center gap-2 rounded-frame bg-cobalt px-5 py-3.5 font-display text-base tracking-wide text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-paper/40"
      >
        <Download size={18} />
        {isExporting ? "Generando…" : "Descargar imagen"}
      </button>
      {!photoDataUrl && (
        <p className="-mt-3 text-center font-mono text-xs text-paper/40">
          sube una foto para habilitar la descarga
        </p>
      )}
    </div>
  );
}
