import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ObraCam — Campo, fotos e orçamento por áudio",
  description:
    "Organize obras por GPS, documente com fotos anotadas, converse com a equipe e gere orçamentos só falando.",
  applicationName: "ObraCam",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#2f5d50",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
