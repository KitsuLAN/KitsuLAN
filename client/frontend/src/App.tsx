import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { JSX, ReactNode, useEffect, useState } from "react"; // Добавили ReactNode
import { Toaster } from "@/components/ui/sonner";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import { CheckServerStatus } from "../wailsjs/go/main/App";
import MainLayout from "./pages/MainLayout";
import RootLayout from "./pages/RootLayout";

// Меняем тип children: JSX.Element -> ReactNode
function ServerGuard({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const status = await CheckServerStatus();
        setIsOnline(status);
      } catch (e) {
        setIsOnline(false);
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline === null)
    return (
      <div className="h-screen flex items-center justify-center text-white bg-background">
        Загрузка...
      </div>
    );

  if (isOnline === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-destructive/10 text-foreground gap-4">
        <h1 className="text-2xl font-bold text-destructive">
          Нет соединения с сервером 🔌
        </h1>
        <p>Убедитесь, что Core-сервис запущен (localhost:8090)</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-secondary rounded hover:bg-secondary/80 text-foreground cursor-pointer"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // ReactNode позволяет возвращать несколько элементов без Fragment,
  // но лучше завернуть их, если ServerGuard это просто обертка
  return <>{children}</>;
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
}

function App() {
  return (
    <ServerGuard>
      <RootLayout>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Login />} />

            <Route
              element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }
            >
              <Route path="/chat" element={<Chat />} />
            </Route>
          </Routes>
        </HashRouter>
      </RootLayout>

      {/* Уведомления */}
      <Toaster theme="dark" position="bottom-right" />
    </ServerGuard>
  );
}

export default App;
