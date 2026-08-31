import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThumbnailTester",
  description:
    "Upload two thumbnails — Ollama Cloud predicts the click-through winner with heatmap reasons.",
  openGraph: {
    title: "ThumbnailTester",
    description:
      "Ollama Cloud vision A/B tester with attention heatmaps.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
