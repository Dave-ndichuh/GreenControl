import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greenhouse Dashboard",
  description: "Live greenhouse monitoring and control",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-neutral-100">{children}</body>
    </html>
  );
}
