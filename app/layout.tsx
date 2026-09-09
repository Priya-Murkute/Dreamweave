import type { Metadata } from "next";
import "./globals.css";
import Walkers from "@/components/Walkers";

export const metadata: Metadata = {
  title: "DreamWeave",
  description: "Turn your dreams into stories.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Nunito:wght@400;600;700;900&family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/*
          <Walkers /> is a client component: it renders nothing on the server
          and fills in a randomized set after mount (see its own comment for
          why). Rendered once here, at the root, rather than per-page.
        */}
        <Walkers />
        {children}
      </body>
    </html>
  );
}
