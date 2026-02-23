import React, { useEffect, useState } from "react";
import { WailsAPI } from "@/api/wails";
import { SetupPage } from "@/pages/SetupPage";
import { Button } from "@/uikit/button";

export function SetupGuard({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<"loading" | "needs_setup" | "ready" | "error">("loading");
    const [errorDetails, setErrorDetails] = useState("");

    const checkStatus = async () => {
        try {
            const res = await WailsAPI.GetRealmStatus();
            if (res.is_initialized) {
                setStatus("ready");
            } else {
                setStatus("needs_setup");
            }
        } catch (e) {
            console.error("SetupGuard Error:", e);
            setStatus("error");
            setErrorDetails(String(e));
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    if (status === "loading") {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-kitsu-bg gap-4">
                <div className="text-4xl animate-bounce">🦊</div>
                <div className="text-muted-foreground animate-pulse">Загрузка KitsuLAN...</div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-kitsu-bg p-6 text-center">
                <div className="text-4xl mb-4">🔌</div>
                <h1 className="text-xl font-bold text-red-500">Нет связи с Core-сервисом</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                    Не удалось подключиться к бэкенду. Убедитесь, что сервис <b>core</b> запущен на порту 8090.
                </p>
                <code className="mt-4 p-2 bg-black/30 rounded text-[10px] text-red-400 font-mono">
                    {errorDetails}
                </code>
                <Button className="mt-6" onClick={() => { setStatus("loading"); checkStatus(); }}>
                    Попробовать снова
                </Button>
            </div>
        );
    }

    if (status === "needs_setup") {
        return <SetupPage onComplete={() => setStatus("ready")} />;
    }

    return <>{children}</>;
}