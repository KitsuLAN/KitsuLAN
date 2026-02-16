import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/uikit/sonner";

import ServerSelect from "@/pages/ServerSelect";
import Login from "@/pages/Login";
import MainLayout from "@/layouts/MainLayout";
import Home from "@/pages/Home";
import ChannelPage from "@/pages/ChannelPage";
import { PrivateRoute } from "@/components/PrivateRoute";
import { useActiveChannelID } from "@/modules/guilds/guildStore";

// Показывает Home или Chat в зависимости от выбранного канала
function AppContent() {
  const channelID = useActiveChannelID();
  return channelID ? <ChannelPage /> : <Home />;
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
          <Route path="/app" element={<MainLayout />}>
            {/* /app/home — когда ничего не выбрано */}
            <Route path="home" element={<Home />} />

            {/* /app/:guildId — зашли в гильдию, канал еще не выбран */}
            <Route path=":guildId" element={<ChannelPage />} />

            {/* /app/:guildId/:channelId — конкретный канал */}
            <Route path=":guildId/:channelId" element={<ChannelPage />} />

            {/* Редирект с голого /app на /app/home */}
            <Route index element={<Navigate to="home" replace />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster theme="dark" position="bottom-right" />
    </HashRouter>
  );
}
