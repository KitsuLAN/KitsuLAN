/**
 * src/App.tsx
 *
 * Маршруты:
 *   /        → ServerSelect (выбор сервера)
 *   /auth    → Login/Register
 *   /app     → PrivateRoute → MainLayout → Chat (и будущие страницы)
 *   /app/:guildId/:channelId → конкретный канал
 *
 * ServerGuard убран отсюда — каждая страница сама проверяет
 * нужные условия и редиректит (serverAddress, isAuthenticated).
 * Это проще и прозрачнее, чем один "умный" guard.
 */
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import ServerSelect from "@/pages/ServerSelect";
import Login from "@/pages/Login";
import MainLayout from "@/pages/MainLayout";
import Chat from "@/pages/Chat";
import { PrivateRoute } from "@/components/PrivateRoute";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 1. Выбор сервера */}
        <Route path="/" element={<ServerSelect />} />

        {/* 2. Авторизация (только если сервер выбран — проверяется внутри Login) */}
        <Route path="/auth" element={<Login />} />

        {/* 3. Основное приложение (только если залогинен) */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/app" element={<Chat />} />
            {/* Будущий роут: /app/:guildId/:channelId */}
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster theme="dark" position="bottom-right" />
    </HashRouter>
  );
}
