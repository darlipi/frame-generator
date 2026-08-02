# Frame & Banner Generator

Generador de marcos/volantes personalizados. 100% renderizado en el navegador
(JAMstack), pensado para tráfico viral con costo $0 de servidor.

## Stack

- **Next.js 14 (App Router) + TypeScript**
- **Tailwind CSS** (paleta y tipografía definidas en `tailwind.config.ts`)
- **Fabric.js** como motor de canvas (Layer 0 foto · Layer 1 marco PNG · Layer 2 texto)
- **Zustand** para el estado global del editor (`store/useEditorStore.ts`)
- Exportación vía `canvas.toDataURL` → `Blob` → descarga directa, sin backend

## Estructura

```
app/
  layout.tsx        # carga de WebFonts (next/font) + variables CSS
  page.tsx           # composición de CanvasEditor + Controls
  globals.css
components/
  CanvasEditor.tsx   # motor de renderizado multicapa (Fabric.js)
  Controls.tsx        # panel de control: foto, zoom, rotación, texto, descarga
lib/
  canvasUtils.ts      # helpers puros: FileReader, fonts, export, cleanup
store/
  useEditorStore.ts   # estado global + esquema de plantilla (Admin Module)
public/frames/
  sample-frame.png    # marco PNG transparente de ejemplo (1080x1080)
```

## Cómo correr

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Cómo agregar una nueva plantilla (Admin Module)

Una plantilla es un objeto plano `FrameTemplate` (ver
`store/useEditorStore.ts`): dimensiones del canvas, URL del PNG del marco,
el bounding box donde encaja la foto, y un arreglo de capas de texto con su
posición, fuente, color y alineación por defecto. En producción esto se
llenaría desde un panel de administración y se pasaría a
`setTemplate(nuevaPlantilla)` — el resto del sistema (Canvas Engine, Controls)
se adapta automáticamente sin cambios de código.

## Notas de rendimiento

- El canvas mantiene su resolución real en píxeles (p. ej. 1080×1080);
  el escalado responsive es puramente CSS (`width: 100%; height: auto`),
  así que la exportación siempre sale a resolución completa.
- Las fuentes se resuelven con `document.fonts.load` + `document.fonts.ready`
  antes de renderizar texto, evitando el clásico bug de FOUT en `<canvas>`.
- Al reemplazar una foto, se libera la referencia de la imagen anterior
  (`disposeFabricImage`) para evitar fugas de memoria en sesiones largas.
- El zoom de la foto está siempre clamped a "cover" (`clampCoverTransform`)
  para que nunca se revele un hueco transparente dentro del marco.
