import { ReactNode, useEffect, useState } from "react";
import { CheckServerStatus } from "../../wailsjs/go/main/App";

export function ServerGuard({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        setIsOnline(await CheckServerStatus());
      } catch {
        setIsOnline(false);
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        Загрузка...
      </div>
    );
  }

  if (isOnline === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-destructive/10 text-foreground gap-4">
        <h1 className="text-2xl font-bold text-destructive">
          Нет соединения с сервером 🔌
        </h1>
        <p>Убедитесь, что Core-сервис запущен (localhost:8090)</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-secondary rounded hover:bg-secondary/80 transition"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
