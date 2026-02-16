import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { cn } from "@/uikit/lib/utils";
import { ServerController, KNOWN_SERVERS } from "@/modules/server/ServerController";
import { useServerAddress, useServerPings } from "@/modules/server/serverStore";

type PingStatus = "checking" | "online" | "offline";

export default function ServerSelect() {
  const navigate = useNavigate();
  const savedAddress = useServerAddress();
  const pings = useServerPings();

  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [customAddr, setCustomAddr] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Запускаем Health Check через контроллер
    ServerController.discoverServers();

    if (savedAddress) {
      const known = KNOWN_SERVERS.find((s) => s.addr === savedAddress);
      if (known) setSelectedID(known.id);
      else setCustomAddr(savedAddress);
    }
  }, [savedAddress]);

  const activeAddr = selectedID
      ? KNOWN_SERVERS.find((s) => s.id === selectedID)?.addr ?? ""
      : customAddr.trim();

  const handleConnect = async () => {
    if (!activeAddr) return;
    setConnecting(true);
    try {
      const ok = await ServerController.connect(activeAddr);
      if (ok) navigate("/auth");
    } finally {
      setConnecting(false);
    }
  };

  return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-kitsu-bg p-6">
        {/* 1. Возвращаем сетчатый фон */}
        <div
            className="pointer-events-none fixed inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                  "linear-gradient(var(--kitsu-orange) 1px, transparent 1px), linear-gradient(90deg, var(--kitsu-orange) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
        />

        <div className="relative z-10 w-full max-w-md">
          {/* 2. Возвращаем логотип и заголовок */}
          <div className="mb-10 text-center">
            <div className="mb-3 text-5xl">🦊</div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              KitsuLAN
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Выберите сервер для подключения
            </p>
          </div>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Известные серверы
          </p>

          <div className="mb-5 flex flex-col gap-2">
            {KNOWN_SERVERS.map((s) => {
              const isSelected = selectedID === s.id;
              const ping = pings[s.id] as PingStatus;
              return (
                  <button
                      key={s.id}
                      onClick={() => {
                        setSelectedID(s.id);
                        setCustomAddr("");
                      }}
                      className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                          isSelected
                              ? "border-primary bg-(--kitsu-orange-dim) text-foreground"
                              : "border-kitsu-s4 bg-kitsu-s1 text-foreground hover:bg-kitsu-s2"
                      )}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-semibold">{s.label}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {s.addr}
                      </div>
                    </div>
                    {/* 3. Возвращаем полноценный бейдж со статусом */}
                    <PingBadge status={ping} />
                  </button>
              );
            })}
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-kitsu-s4" />
            <span className="text-xs text-muted-foreground/40">или</span>
            <div className="h-px flex-1 bg-kitsu-s4" />
          </div>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Адрес сервера
          </p>
          <Input
              placeholder="host:8090"
              value={customAddr}
              onChange={(e) => {
                setCustomAddr(e.target.value);
                setSelectedID(null);
              }}
              className="mb-6 bg-kitsu-bg font-mono"
          />

          <Button
              size="lg"
              className="w-full font-semibold"
              disabled={!activeAddr || connecting}
              onClick={handleConnect}
          >
            {connecting ? "Подключение…" : "Подключиться →"}
          </Button>

          <p className="mt-5 text-center text-[11px] text-muted-foreground/30">
            Ваши данные хранятся только на вашем сервере
          </p>
        </div>
      </div>
  );
}

/**
 * 4. Возвращаем детальный бейдж: точка + надпись online/offline
 */
function PingBadge({ status }: { status?: PingStatus }) {
  if (!status || status === "checking") {
    return <span className="text-xs text-muted-foreground/40 tabular-nums">···</span>;
  }

  return (
      <div className="flex items-center gap-1.5">
      <span
          className={cn(
              "h-2 w-2 rounded-full",
              status === "online" ? "bg-kitsu-online" : "bg-kitsu-offline"
          )}
      />
        <span
            className={cn(
                "text-xs font-semibold uppercase tracking-tight",
                status === "online" ? "text-kitsu-online" : "text-muted-foreground/50"
            )}
        >
        {status}
      </span>
      </div>
  );
}