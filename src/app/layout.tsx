import type { Metadata } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import CursorGlow from "@/components/Cursorglow";

export const metadata: Metadata = {
  title: "Athletics Meet Protocol",
  description: "Лёгкоатлетический чемпионат — протоколы и командный зачёт, офлайн-режим",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-[#0A0C10] font-body antialiased">
        {/* Единый векторный фон приложения — линии дорожек + мягкое свечение
            по углам, без внешних фотографий (см. design system: backdrop). */}
        <div className="stadium-photos" aria-hidden="true" />
        <div className="stadium-vignette" aria-hidden="true" />
        <CursorGlow />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
