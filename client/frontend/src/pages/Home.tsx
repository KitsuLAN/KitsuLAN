import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuilds, useGuildActions } from "@/stores/guildStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Простой inline-диалог ──────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-kitsu-s4 bg-kitsu-s1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Диалог создания гильдии ───────────────────────────────────────────────

function CreateGuildModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const { createGuild, selectGuild } = useGuildActions();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const guild = await createGuild(name.trim(), desc.trim());
      toast.success(`Гильдия «${guild.name}» создана!`);
      selectGuild(guild.id!);
      onClose();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Создать гильдию" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Название *
          </label>
          <Input
            placeholder="Моя гильдия"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-kitsu-bg"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Описание
          </label>
          <Input
            placeholder="Необязательно"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="bg-kitsu-bg"
          />
        </div>
        <Button
          className="mt-1 w-full"
          disabled={!name.trim() || loading}
          onClick={handleCreate}
        >
          {loading ? "Создаём…" : "Создать"}
        </Button>
      </div>
    </Modal>
  );
}

// ── Диалог вступления по инвайту ──────────────────────────────────────────

function JoinGuildModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { joinByInvite, selectGuild } = useGuildActions();

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const guild = await joinByInvite(code.trim());
      toast.success(`Вы вступили в «${guild.name}»!`);
      selectGuild(guild.id!);
      onClose();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Вступить по инвайту" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Код приглашения
          </label>
          <Input
            placeholder="XXXXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="bg-kitsu-bg font-mono tracking-widest"
            autoFocus
          />
        </div>
        <Button
          className="mt-1 w-full"
          disabled={!code.trim() || loading}
          onClick={handleJoin}
        >
          {loading ? "Вступаем…" : "Вступить"}
        </Button>
      </div>
    </Modal>
  );
}

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
