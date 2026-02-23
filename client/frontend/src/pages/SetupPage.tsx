import { useState } from "react";
import { WailsAPI } from "@/api/wails";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { parseWailsError } from "@/api/errors";
import { toast } from "sonner";

export function SetupPage({ onComplete }: { onComplete: () => void }) {
    const [domain, setDomain] = useState("localhost");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        try {
            await WailsAPI.SetupRealm(domain, name);
            toast.success("Реалм успешно настроен!");
            onComplete();
        } catch (e) {
            const err = parseWailsError(e);
            toast.error(`Ошибка [${err.code}]: ${err.message}`, {
                description: err.remedy,
                duration: 10000
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-kitsu-bg p-6 text-center">
            <div className="max-w-sm w-full space-y-6">
                <div className="text-6xl">🦊</div>
                <h1 className="text-2xl font-bold">Первичная настройка</h1>
                <p className="text-sm text-muted-foreground">Добро пожаловать! Давайте настроим ваш новый Реалм.</p>

                <div className="space-y-4 text-left">
                    <div className="space-y-1.5">
                        <label className="text-xs uppercase font-bold text-muted-foreground">Домен узла</label>
                        <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="kitsu.myhome.lan" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs uppercase font-bold text-muted-foreground">Название сервера</label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Моя Берлога" />
                    </div>
                </div>

                <Button className="w-full" size="lg" disabled={!name || loading} onClick={handleSetup}>
                    {loading ? "Инициализация..." : "Запустить сервер →"}
                </Button>
            </div>
        </div>
    );
}