// src/app/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { AppController } from "@/app/AppController";
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