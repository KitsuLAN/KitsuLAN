import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import { CheckServerStatus } from "../wailsjs/go/main/App"; // Импорт функции проверки

// Компонент-обертка для проверки сети
function ServerGuard({ children }: { children: JSX.Element }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const status = await CheckServerStatus();
      setIsOnline(status);
    };

    check();
    // Поллинг каждые 5 секунд (проверка связи)
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline === null)
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Загрузка...
      </div>
    );

  if (isOnline === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-900/20 text-white gap-4">
        <h1 className="text-2xl font-bold text-red-500">
          Нет соединения с сервером 🔌
        </h1>
        <p>Убедитесь, что Core-сервис запущен (localhost:8090)</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return children;
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
}

function App() {
  return (
    <ServerGuard>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
        </Routes>
      </HashRouter>
    </ServerGuard>
  );
}

export default App;
