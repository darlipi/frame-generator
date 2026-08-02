import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// These same font-family names are referenced inside store/useEditorStore.ts
// (FrameTemplate.textLayers[].fontFamily), so the canvas engine renders with
// the exact families the DOM has already fetched via next/font.
const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Frame Generator — Marcos personalizados en segundos",
  description:
    "Sube tu foto, personaliza el texto y descarga tu marco en alta calidad. 100% en tu navegador.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-ink font-body text-paper antialiased">
        {children}
      </body>
    </html>
  );
}
