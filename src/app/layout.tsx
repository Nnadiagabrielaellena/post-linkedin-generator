import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PostLinked — Generador de posts para LinkedIn",
  description: "Genera posts profesionales para LinkedIn con inteligencia artificial, personalizados para tu negocio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0 }}>{children}</body>
    </html>
  );
}
