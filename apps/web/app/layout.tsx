import type { Metadata } from "next";
import { StageAudioRecovery } from "@/components/StageAudioRecovery";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relic",
  description: "Game Master software for Sagas, canon, prep, and play."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><StageAudioRecovery />{children}</body>
    </html>
  );
}
