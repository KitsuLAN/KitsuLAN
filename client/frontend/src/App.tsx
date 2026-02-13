import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import ServerSelect from "@/pages/ServerSelect";
import Login from "@/pages/Login";
import MainLayout from "@/pages/MainLayout";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import { PrivateRoute } from "@/components/PrivateRoute";
import { useActiveChannelID } from "@/stores/guildStore";

// Показывает Home или Chat в зависимости от выбранного канала
function AppContent() {
  const channelID = useActiveChannelID();
  return channelID ? <Chat /> : <Home />;
}

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
            <Route path="/app" element={<AppContent />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster theme="dark" position="bottom-right" />
    </HashRouter>
  );
}
