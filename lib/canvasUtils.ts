import { fabric } from "fabric";

/**
 * ---------------------------------------------------------------------------
 * canvasUtils.ts
 * ---------------------------------------------------------------------------
 * Pure, framework-agnostic helpers around Fabric.js / the Canvas API.
 * Nothing here touches React state — CanvasEditor.tsx wires these into the
 * component lifecycle. Keeping this isolated makes each function unit
 * testable and reusable if the rendering engine is ever swapped.
 */

/* ----------------------------- File → Image ----------------------------- */

/**
 * Reads a File (e.g. from an <input type="file"> or drop event) into a
 * base64 data URL using FileReader. Everything stays in the browser —
 * no bytes are ever sent to a server, which is both a privacy and a
 * performance win (Requirement: "Cero Latencia de Servidor").
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo seleccionado no es una imagen."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Loads a fabric.Image from a URL or data URL, wrapped in a Promise.
 * `crossOrigin` is set so canvases loading remote frame assets don't get
 * tainted (which would silently break toDataURL/toBlob exports).
 */
export function loadFabricImage(
  src: string,
  options: fabric.IImageOptions = {}
): Promise<fabric.Image> {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(
      src,
      (img) => {
        if (!img || !img.width || !img.height) {
          reject(new Error("No se pudo cargar la imagen."));
          return;
        }
        resolve(img);
      },
      { crossOrigin: "anonymous", ...options }
    );
  });
}

/* -------------------------------- Fonts ---------------------------------- */

/**
 * Ensures every custom WebFont used by the template's text layers is fully
 * loaded and parsed before the canvas renders text. Without this, the first
 * paint (and worse, the exported PNG) can silently fall back to a system
 * font — the classic FOUT-on-canvas bug, since <canvas> has no reflow event
 * to recover from a late-loading font the way DOM text does.
 */
export async function ensureFontsReady(fontFamilies: string[]): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;

  // Force the browser to actually fetch each family by rendering a hidden
  // probe string in it — `document.fonts.ready` alone only resolves once
  // fonts that are *already requested* finish loading.
  const probes = fontFamilies.map(
    (family) => `1em ${family.split(",")[0].trim()}`
  );
  await Promise.all(
    probes.map((font) =>
      document.fonts.load(font).catch(() => {
        /* Font failed to load — rendering will fall back gracefully. */
      })
    )
  );
  await document.fonts.ready;
}

/* -------------------------------- Export --------------------------------- */

export type ExportFormat = "png" | "jpeg";

interface ExportOptions {
  format: ExportFormat;
  quality?: number; // 0–1, used for jpeg
  multiplier?: number; // supersampling factor for high-res export
}

/**
 * Renders the canvas at full (or supersampled) resolution and resolves a
 * Blob via toBlob-equivalent semantics. Fabric's toDataURL is synchronous
 * and CPU-bound, so we hop it onto a data URL first, then convert to a Blob
 * so the caller can use either object URLs or direct download links.
 */
export async function exportCanvasToBlob(
  canvas: fabric.Canvas,
  { format, quality = 0.92, multiplier = 1 }: ExportOptions
): Promise<Blob> {
  const dataUrl = canvas.toDataURL({
    format,
    quality,
    multiplier,
  });

  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Triggers a client-side download of a Blob with the given filename.
 * The object URL is revoked immediately after the click is dispatched to
 * free memory — important on low-RAM mobile devices doing repeat exports
 * (Requirement: Memory Management).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke on the next tick so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------------------- Memory cleanup ------------------------------ */

/**
 * Disposes a fabric.Image's underlying <img> element reference and removes
 * it from the canvas. Call this whenever a user replaces their photo, so the
 * previous bitmap isn't kept alive in memory (relevant on devices with
 * limited RAM after several photo swaps in one session).
 */
export function disposeFabricImage(img: fabric.Image | null | undefined) {
  if (!img) return;
  const element = img.getElement() as HTMLImageElement | undefined;
  if (element) {
    element.src = "";
    element.removeAttribute("src");
  }
  img.dispose?.();
}

/**
 * Clamps a photo's scale/position so it always fully covers a bounding box
 * (object-fit: cover behavior), preventing users from zooming out into
 * transparent gaps within the frame's cutout window.
 */
export function clampCoverTransform(
  imageWidth: number,
  imageHeight: number,
  box: { width: number; height: number },
  scale: number
): { minScale: number; scale: number } {
  const minScale = Math.max(box.width / imageWidth, box.height / imageHeight);
  return { minScale, scale: Math.max(scale, minScale) };
}
