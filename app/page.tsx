import CanvasEditor from "@/components/CanvasEditor";
import Controls from "@/components/Controls";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-cobalt-400">
          contact sheet · 01
        </span>
        <h1 className="font-display text-4xl leading-none tracking-tight text-paper sm:text-5xl">
          Tu marco, revelado al instante
        </h1>
        <p className="max-w-lg text-sm text-paper/60 sm:text-base">
          Sube tu foto, escribe tu texto y descarga tu imagen en alta
          resolución. Todo se procesa en tu dispositivo — nada se sube a
          ningún servidor.
        </p>
      </header>

      <div className="flex flex-col items-start gap-10 lg:flex-row lg:justify-center">
        <CanvasEditor />
        <Controls />
      </div>

      <footer className="mt-auto pt-8 font-mono text-xs text-paper/30">
        renderizado 100% en el navegador · sin subida de imágenes a servidor
      </footer>
    </main>
  );
}
