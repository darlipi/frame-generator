"use client";

import { fabric } from "fabric";
import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import {
  loadFabricImage,
  ensureFontsReady,
  exportCanvasToBlob,
  downloadBlob,
  disposeFabricImage,
  clampCoverTransform,
} from "@/lib/canvasUtils";

/**
 * ---------------------------------------------------------------------------
 * CanvasEditor
 * ---------------------------------------------------------------------------
 * The "Canvas Engine" agent. Owns the fabric.Canvas instance and renders
 * three layers in strict order:
 *
 *   Layer 0  photoImage   – user's photo, pannable / pinch-zoomable
 *   Layer 1  frameImage   – transparent PNG overlay (locked, non-interactive)
 *   Layer 2  textObjects  – dynamic text driven by the store
 *
 * The canvas's internal pixel resolution always equals the template's
 * defined size (e.g. 1080x1080). Responsive sizing is done purely with CSS
 * (width: 100%, height: auto) on the wrapping element, so `toDataURL`
 * exports always come out at full resolution with zero extra logic.
 */

const HANDLE_COLOR = "#2B4CE0";

export default function CanvasEditor() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const photoObjRef = useRef<fabric.Image | null>(null);
  const frameObjRef = useRef<fabric.Image | null>(null);
  const textObjRefs = useRef<Record<string, fabric.Textbox>>({});
  const pinchStateRef = useRef<{ distance: number; scale: number } | null>(
    null
  );

  const template = useEditorStore((s) => s.template);
  const photoDataUrl = useEditorStore((s) => s.photoDataUrl);
  const photoTransform = useEditorStore((s) => s.photoTransform);
  const textValues = useEditorStore((s) => s.textValues);
  const isExporting = useEditorStore((s) => s.isExporting);
  const setPhotoTransform = useEditorStore((s) => s.setPhotoTransform);
  const setExporting = useEditorStore((s) => s.setExporting);
  const setCanvasReady = useEditorStore((s) => s.setCanvasReady);

  /* --------------------------- Initialize canvas --------------------------- */
  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: template.canvasWidth,
      height: template.canvasHeight,
      backgroundColor: "#1A1E27",
      preserveObjectStacking: true,
      selection: false,
    });
    fabricCanvasRef.current = canvas;

    // Fabric's default control styling — tuned so touch targets stay usable
    // on mobile screens (Requirement: mobile-first gestural controls).
    fabric.Object.prototype.set({
      borderColor: HANDLE_COLOR,
      cornerColor: HANDLE_COLOR,
      cornerStrokeColor: "#F1EFEA",
      cornerSize: 22,
      cornerStyle: "circle",
      transparentCorners: false,
      padding: 4,
    });

    let cancelled = false;

    (async () => {
      // Fonts must be resolved before any text renders, or the exported
      // PNG can silently ship in a fallback system font.
      const families = template.textLayers.map((l) => l.fontFamily);
      await ensureFontsReady(families);

      // Layer 1: frame overlay, loaded first so we know it renders on top
      // once the photo is added beneath it.
      const frameImg = await loadFabricImage(template.frameUrl);
      if (cancelled) return;
      frameImg.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        scaleX: template.canvasWidth / (frameImg.width || template.canvasWidth),
        scaleY:
          template.canvasHeight / (frameImg.height || template.canvasHeight),
      });
      frameObjRef.current = frameImg;

      // Layer 2: text layers, positioned per template config.
      template.textLayers.forEach((layer) => {
        const textbox = new fabric.Textbox(
          textValues[layer.id] ?? layer.defaultText,
          {
            left: layer.x,
            top: layer.y,
            originX: "center",
            originY: "center",
            fontSize: layer.fontSize,
            fontFamily: layer.fontFamily,
            fontWeight: layer.fontWeight,
            fill: layer.color,
            textAlign: layer.align,
            width: layer.maxWidth,
            editable: false,
            selectable: false,
            evented: false,
          }
        );
        textObjRefs.current[layer.id] = textbox;
      });

      // Add in strict z-order: photo (if any) → frame → text.
      canvas.add(frameImg);
      Object.values(textObjRefs.current).forEach((t) => canvas.add(t));
      canvas.renderAll();
      setCanvasReady(true);
    })();

    return () => {
      cancelled = true;
      canvas.dispose();
      fabricCanvasRef.current = null;
      photoObjRef.current = null;
      frameObjRef.current = null;
      textObjRefs.current = {};
    };
    // Re-init only if the template itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  /* ------------------------- Load / replace the photo ------------------------ */
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !photoDataUrl) return;

    let cancelled = false;

    (async () => {
      const img = await loadFabricImage(photoDataUrl);
      if (cancelled) return;

      const box = template.photoBoundingBox;
      const { minScale } = clampCoverTransform(
        img.width || 1,
        img.height || 1,
        box,
        1
      );

      img.set({
        left: box.x + box.width / 2,
        top: box.y + box.height / 2,
        originX: "center",
        originY: "center",
        scaleX: minScale,
        scaleY: minScale,
        clipPath: new fabric.Rect({
          left: box.x + box.width / 2,
          top: box.y + box.height / 2,
          originX: "center",
          originY: "center",
          width: box.width,
          height: box.height,
          absolutePositioned: true,
        }),
        selectable: true,
        hasRotatingPoint: true,
        lockScalingFlip: true,
      });

      // Remove any previous photo before inserting the new one.
      if (photoObjRef.current) {
        canvas.remove(photoObjRef.current);
        disposeFabricImage(photoObjRef.current);
      }
      photoObjRef.current = img;

      // Insert at index 0 so it always sits beneath the frame and text.
      canvas.insertAt(img, 0, false);

      img.on("modified", () => {
        setPhotoTransform({
          scale: img.scaleX || 1,
          offsetX: img.left || 0,
          offsetY: img.top || 0,
          rotation: img.angle || 0,
        });
      });

      canvas.setActiveObject(img);
      canvas.renderAll();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoDataUrl, template]);

  /* --------------------- Apply zoom/rotation from Controls -------------------- */
  useEffect(() => {
    const img = photoObjRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img || !canvas) return;

    const box = template.photoBoundingBox;
    const { minScale, scale } = clampCoverTransform(
      img.width || 1,
      img.height || 1,
      box,
      photoTransform.scale
    );

    img.set({
      scaleX: scale,
      scaleY: scale,
      angle: photoTransform.rotation,
    });

    // Keep the store's floor in sync so the Controls slider never lets the
    // user zoom out past "cover" and reveal transparent gaps.
    if (photoTransform.scale < minScale) {
      setPhotoTransform({ scale: minScale });
    }

    canvas.renderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoTransform.scale, photoTransform.rotation]);

  /* ------------------------- Sync text layers live -------------------------- */
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    template.textLayers.forEach((layer) => {
      const obj = textObjRefs.current[layer.id];
      const value = textValues[layer.id] ?? layer.defaultText;
      if (obj && obj.text !== value) {
        obj.set({ text: value });
      }
    });
    canvas.renderAll();
  }, [textValues, template]);

  /* ----------------------- Touch gestures: pinch to zoom ---------------------- */
  const getTouchDistance = (touches: TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStateRef.current = {
        distance: getTouchDistance(e.touches as unknown as TouchList),
        scale: useEditorStore.getState().photoTransform.scale,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStateRef.current) {
        e.preventDefault();
        const newDistance = getTouchDistance(
          e.touches as unknown as TouchList
        );
        const ratio = newDistance / pinchStateRef.current.distance;
        setPhotoTransform({
          scale: pinchStateRef.current.scale * ratio,
        });
      }
    },
    [setPhotoTransform]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStateRef.current = null;
  }, []);

  /* ------------------------------- Export/download ------------------------------ */
  const handleDownload = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setExporting(true);
    try {
      canvas.discardActiveObject();
      canvas.renderAll();
      const blob = await exportCanvasToBlob(canvas, {
        format: "png",
        multiplier: 1,
      });
      downloadBlob(blob, `${template.id}-${Date.now()}.png`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [template.id, setExporting]);

  // Expose the download handler to sibling Controls via a data attribute +
  // custom event, so both components stay decoupled from a shared ref.
  useEffect(() => {
    const listener = () => handleDownload();
    window.addEventListener("frame-generator:download", listener);
    return () =>
      window.removeEventListener("frame-generator:download", listener);
  }, [handleDownload]);

  return (
    <div
      className="relative mx-auto w-full max-w-[520px] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full overflow-hidden rounded-frame border border-white/10 bg-ink-800 shadow-contact [&_.canvas-container]:!w-full [&_.canvas-container]:!h-auto [&_canvas]:!w-full [&_canvas]:!h-auto">
        <canvas ref={canvasElRef} className="block" />
      </div>

      {isExporting && (
        <div className="absolute inset-0 flex items-center justify-center rounded-frame bg-ink/70 backdrop-blur-sm">
          <span className="font-mono text-sm tracking-wide text-paper">
            renderizando…
          </span>
        </div>
      )}
    </div>
  );
}
