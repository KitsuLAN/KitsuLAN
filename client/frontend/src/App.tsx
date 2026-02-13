import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ServerGuard } from "@/components/ServerGuard";
import { PrivateRoute } from "@/components/PrivateRoute";
import Login from "@/pages/Login";
import MainLayout from "@/pages/MainLayout";
import Chat from "@/pages/Chat";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function App() {
  return (
    <ServerGuard>
      <ThemeProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<PrivateRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/chat" element={<Chat />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
        <Toaster theme="dark" position="bottom-right" />
      </ThemeProvider>
    </ServerGuard>
  );
}
