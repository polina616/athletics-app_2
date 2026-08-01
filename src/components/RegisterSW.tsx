"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    // В разработке сервис-воркер только мешает: кеширует старый HTML/чанки
    // между пересборками и может показывать "битую" или пустую страницу
    // после hot-reload. Регистрируем его только в продакшн-сборке.
    if (process.env.NODE_ENV !== "production") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[sw] registration failed", err);
      });
    }
  }, []);
  return null;
}