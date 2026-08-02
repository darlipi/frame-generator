import { create } from "zustand";

/**
 * ---------------------------------------------------------------------------
 * Editor domain types
 * ---------------------------------------------------------------------------
 * These mirror the "Admin Module" concept: a template defines the canvas size,
 * the bounding box the user's photo must fill, and one or more dynamic text
 * layers with defaults for font, color, size and position. Everything here is
 * plain, serializable data — no Fabric.js objects — so a template JSON could
 * be swapped in from a CMS/admin panel with zero code changes.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextLayerConfig {
  id: string;
  label: string; // shown in the Controls panel, e.g. "Attendee name"
  defaultText: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  align: "left" | "center" | "right";
  maxWidth: number;
}

export interface FrameTemplate {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  frameUrl: string; // transparent PNG, Layer 1
  photoBoundingBox: BoundingBox; // where the user's photo is clipped/fit
  textLayers: TextLayerConfig[];
}

export interface PhotoTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

interface EditorState {
  template: FrameTemplate;
  photoDataUrl: string | null;
  photoTransform: PhotoTransform;
  textValues: Record<string, string>; // textLayerId -> current text
  isExporting: boolean;
  isCanvasReady: boolean;

  setPhoto: (dataUrl: string) => void;
  clearPhoto: () => void;
  setPhotoTransform: (partial: Partial<PhotoTransform>) => void;
  resetPhotoTransform: () => void;
  setTextValue: (id: string, value: string) => void;
  setTemplate: (template: FrameTemplate) => void;
  setExporting: (value: boolean) => void;
  setCanvasReady: (value: boolean) => void;
}

// A default template. In production this would come from the Admin Module
// (a small JSON schema an admin fills in via a form) rather than being
// hardcoded here.
export const defaultTemplate: FrameTemplate = {
  id: "event-square-v1",
  name: "Event Square Frame",
  canvasWidth: 1080,
  canvasHeight: 1080,
  frameUrl: "/frames/sample-frame.png",
  photoBoundingBox: { x: 90, y: 90, width: 900, height: 900 },
  textLayers: [
    {
      id: "name",
      label: "Your name",
      defaultText: "YOUR NAME",
      x: 540,
      y: 940,
      fontSize: 56,
      fontFamily: "Anton, sans-serif",
      color: "#F1EFEA",
      fontWeight: "400",
      align: "center",
      maxWidth: 900,
    },
    {
      id: "tagline",
      label: "Tagline / role",
      defaultText: "I'm attending",
      x: 540,
      y: 1000,
      fontSize: 28,
      fontFamily: "Inter, sans-serif",
      color: "#5670EA",
      fontWeight: "600",
      align: "center",
      maxWidth: 900,
    },
  ],
};

export const useEditorStore = create<EditorState>((set) => ({
  template: defaultTemplate,
  photoDataUrl: null,
  photoTransform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  textValues: Object.fromEntries(
    defaultTemplate.textLayers.map((l) => [l.id, l.defaultText])
  ),
  isExporting: false,
  isCanvasReady: false,

  setPhoto: (dataUrl) =>
    set({
      photoDataUrl: dataUrl,
      photoTransform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    }),

  clearPhoto: () =>
    set({
      photoDataUrl: null,
      photoTransform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    }),

  setPhotoTransform: (partial) =>
    set((state) => ({
      photoTransform: { ...state.photoTransform, ...partial },
    })),

  resetPhotoTransform: () =>
    set({ photoTransform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 } }),

  setTextValue: (id, value) =>
    set((state) => ({
      textValues: { ...state.textValues, [id]: value },
    })),

  setTemplate: (template) =>
    set({
      template,
      textValues: Object.fromEntries(
        template.textLayers.map((l) => [l.id, l.defaultText])
      ),
    }),

  setExporting: (value) => set({ isExporting: value }),
  setCanvasReady: (value) => set({ isCanvasReady: value }),
}));
