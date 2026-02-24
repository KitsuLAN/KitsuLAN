import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WailsAPI } from "@/api/wails";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { handleApiError } from "@/api/errors";
import { toast } from "sonner";
import { useServerAddress } from "@/modules/server/serverStore";

export function SetupPage() {
    const navigate = useNavigate();
    const serverAddress = useServerAddress();
    const [domain, setDomain] = useState("localhost");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        try {
            await WailsAPI.SetupRealm(domain, name);
            toast.success("Сервер успешно инициализирован!");
            navigate("/auth");
        } catch (e) {
            handleApiError(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-kitsu-bg p-6 text-center relative">
            {/* Кнопка назад */}
            <button
                type="button"
                onClick={() => navigate("/")}
                className="absolute top-8 left-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                ← Вернуться к выбору сервера
            </button>

            <div className="max-w-sm w-full space-y-6">
                <div className="text-6xl">🦊</div>
                <h1 className="text-2xl font-bold">Новый сервер найден!</h1>
                <p className="text-sm text-muted-foreground">
                    Узел <b>{serverAddress}</b> ещё не настроен. Задайте параметры для его инициализации.
                </p>

                <div className="space-y-4 text-left border border-kitsu-s4 bg-kitsu-s1 p-5 rounded-xl">
                    <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Домен узла (или IP)</label>
                        <Input
                            value={domain}
                            onChange={e => setDomain(e.target.value)}
                            placeholder="kitsu.myhome.lan"
                            className="bg-kitsu-bg"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Название сервера</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Моя Берлога"
                            className="bg-kitsu-bg"
                        />
                    </div>
                </div>

                <Button className="w-full font-bold" size="lg" disabled={!name || loading} onClick={handleSetup}>
                    {loading ? "Инициализация..." : "Запустить сервер →"}
                </Button>
            </div>
        </div>
    );
}