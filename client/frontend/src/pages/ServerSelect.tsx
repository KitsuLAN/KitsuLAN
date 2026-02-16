/**
 * src/pages/ServerSelect.tsx
 * Экран выбора / ввода адреса сервера.
 * Использует: shadcn Button, Input, Card
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { WailsAPI } from "@/api/wails";
import { useServerActions, useServerAddress } from "@/modules/server/serverStore";
import { cn } from "@/uikit/lib/utils";

// Список известных серверов — в будущем можно хранить в serverStore
const KNOWN_SERVERS = [
  { id: "1", label: "Локальный", addr: "localhost:8090", icon: "🦊" },
  { id: "2", label: "LAN Party", addr: "192.168.1.10:8090", icon: "🎮" },
  { id: "3", label: "RPi Node", addr: "10.0.0.5:8090", icon: "🍓" },
];

type PingStatus = "checking" | "online" | "offline";

export default function ServerSelect() {
  const navigate = useNavigate();
  const { setAddress } = useServerActions();
  const savedAddress = useServerAddress();

  const [selected, setSelected] = useState<string | null>(null);
  const [customAddr, setCustomAddr] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [pings, setPings] = useState<Record<string, PingStatus>>({});

  // Пингуем каждый сервер при загрузке
  useEffect(() => {
    const initial: Record<string, PingStatus> = {};
    KNOWN_SERVERS.forEach((s) => {
      initial[s.id] = "checking";
    });
    setPings(initial);

    KNOWN_SERVERS.forEach((s) => {
      // Таймаут чтобы анимация "checking" была заметна
      const delay = 300 + Math.random() * 600;
      setTimeout(async () => {
        try {
          // В реальном проекте: WailsAPI.ConnectToServer(s.addr)
          // Здесь используем CheckServerStatus только для localhost
          const ok = s.addr.startsWith("localhost")
            ? await WailsAPI.CheckServerStatus()
            : false; // для LAN-адресов mock всегда offline
          setPings((prev) => ({ ...prev, [s.id]: ok ? "online" : "offline" }));
        } catch {
          setPings((prev) => ({ ...prev, [s.id]: "offline" }));
        }
      }, delay);
    });
  }, []);

  // Если уже выбирали сервер — пре-заполняем
  useEffect(() => {
    if (savedAddress) {
      const known = KNOWN_SERVERS.find((s) => s.addr === savedAddress);
      if (known) setSelected(known.id);
      else setCustomAddr(savedAddress);
    }
  }, [savedAddress]);

  const activeAddr = selected
    ? KNOWN_SERVERS.find((s) => s.id === selected)?.addr ?? ""
    : customAddr.trim();

  const handleConnect = async () => {
    if (!activeAddr) return;
    setConnecting(true);
    try {
      setAddress(activeAddr);
      navigate("/auth");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-kitsu-bg p-6">
      {/* Сетчатый фон — лёгкий намёк на LAN */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--kitsu-orange) 1px, transparent 1px), linear-gradient(90deg, var(--kitsu-orange) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Логотип */}
        <div className="mb-10 text-center">
          <div className="mb-3 text-5xl">🦊</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            KitsuLAN
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Выберите сервер для подключения
          </p>
        </div>

        {/* Известные серверы */}
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Известные серверы
        </p>
        <div className="mb-5 flex flex-col gap-2">
          {KNOWN_SERVERS.map((s) => {
            const isSelected = selected === s.id;
            const ping = pings[s.id];
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s.id);
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
                <PingBadge status={ping} />
              </button>
            );
          })}
        </div>

        {/* Разделитель */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-kitsu-s4" />
          <span className="text-xs text-muted-foreground/40">или</span>
          <div className="h-px flex-1 bg-kitsu-s4" />
        </div>

        {/* Ввод вручную */}
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Адрес сервера
        </p>
        <Input
          placeholder="host:8090"
          value={customAddr}
          onChange={(e) => {
            setCustomAddr(e.target.value);
            setSelected(null);
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

// ── Вспомогательный компонент — бейдж статуса пинга ──
function PingBadge({ status }: { status?: PingStatus }) {
  if (!status || status === "checking") {
    return (
      <span className="text-xs text-muted-foreground/40 tabular-nums">···</span>
    );
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
          "text-xs font-semibold",
          status === "online" ? "text-kitsu-online" : "text-muted-foreground/50"
        )}
      >
        {status === "online" ? "online" : "offline"}
      </span>
    </div>
  );
}
