import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGuilds, useGuildActions } from "@/stores/guildStore";
import { cn } from "@/lib/utils";
import {
  CreateGuildModal,
  JoinGuildModal,
} from "@/components/layout/GuildModal";

// ── Главная страница ──────────────────────────────────────────────────────

type ModalType = "create" | "join" | null;

export default function Home() {
  const guilds = useGuilds();
  const { selectGuild } = useGuildActions();
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      <div className="flex h-full flex-col items-center justify-center gap-8 px-8">
        {guilds.length === 0 ? (
          // Первый запуск — нет гильдий
          <div className="text-center">
            <div className="mb-4 text-6xl">🦊</div>
            <h1 className="mb-2 text-2xl font-bold">
              Добро пожаловать в KitsuLAN
            </h1>
            <p className="mb-8 text-sm text-muted-foreground">
              Создайте первую гильдию или вступите по инвайту
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setModal("create")}>
                + Создать гильдию
              </Button>
              <Button variant="outline" onClick={() => setModal("join")}>
                Вступить по коду
              </Button>
            </div>
          </div>
        ) : (
          // Есть гильдии — показываем список и действия
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <div className="mb-2 text-4xl">🦊</div>
              <h1 className="text-xl font-bold">Выберите канал слева</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                или создайте новое пространство
              </p>
            </div>

            {/* Быстрые действия */}
            <div className="mb-6 flex gap-2">
              <Button className="flex-1" onClick={() => setModal("create")}>
                + Создать гильдию
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setModal("join")}
              >
                Вступить по коду
              </Button>
            </div>

            {/* Список гильдий */}
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Ваши гильдии
            </p>
            <div className="flex flex-col gap-1.5">
              {guilds.map((g, i) => {
                const colors = [
                  "bg-primary",
                  "bg-violet-700",
                  "bg-cyan-700",
                  "bg-emerald-700",
                  "bg-rose-700",
                  "bg-amber-700",
                ];
                const color = colors[i % colors.length];
                return (
                  <button
                    key={g.id}
                    onClick={() => selectGuild(g.id!)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-kitsu-s4",
                      "bg-kitsu-s1 px-4 py-3 text-left transition-colors hover:bg-kitsu-s2"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                        color
                      )}
                    >
                      {(g.name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-sm">
                        {g.name}
                      </div>
                      {g.description && (
                        <div className="truncate text-xs text-muted-foreground">
                          {g.description}
                        </div>
                      )}
                    </div>
                    <span className="ml-auto text-muted-foreground/40 text-sm">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modal === "create" && (
        <CreateGuildModal onClose={() => setModal(null)} />
      )}
      {modal === "join" && <JoinGuildModal onClose={() => setModal(null)} />}
    </>
  );
}
