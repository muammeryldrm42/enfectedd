import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HANTA INC",
  description: "A strategic infection simulation with alien intervention.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
