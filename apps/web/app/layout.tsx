import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Relic",
  description: "A spatial workspace for creating, remembering, and running fictional worlds."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1612" }
  ]
};

/**
 * Applies the device's saved light preference before first paint, so a GM in
 * a dark room never sees a daylight frame. Mirrors ProfileControl's storage.
 */
const LIGHT_PREFERENCE = `try{var l=localStorage.getItem("relic.lightPreference");if(l==="daylight"||l==="lamplit")document.documentElement.dataset.relicLight=l}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The light preference attribute is set by the script above before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LIGHT_PREFERENCE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
