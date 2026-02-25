// src/app/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { AppController } from "@/app/AppController";

// Подключаем локальные шрифты нужного начертания
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import App from "./App";
import "../style.css";

const container = document.getElementById("root");
const root = createRoot(container!);

// Инициализируем систему перед рендерингом
async function init() {
    try {
        // Вызываем boot: коннект к серверу, проброс токена в Go
        await AppController.boot();
    } catch (e) {
        console.error("System boot failed", e);
    } finally {
        // В любом случае запускаем UI, роутер сам разберется куда отправить пользователя
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    }
}

init();