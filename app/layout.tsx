import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HF Copilot — Heart Failure Decision Support",
  description:
    "Structured classification, staging, GDMT sequencing, and management support for heart failure, based on the 2025 HFAI guidelines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
