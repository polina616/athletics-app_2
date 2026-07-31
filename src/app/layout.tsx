import type { Metadata } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Athletics Meet Protocol",
  description: "Лёгкоатлетический чемпионат — протоколы и командный зачёт, офлайн-режим",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-[#0B0D12]">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}