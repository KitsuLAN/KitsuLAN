import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modals/Modal";
import { GuildController } from "@/modules/guilds/GuildController";
import { handleApiError } from "@/api/errors";
import { Loader2 } from "lucide-react";

// Кнопка (в стиле uikit/button.tsx, но инлайн здесь для наглядности)
function Button({ children, loading, className, ...props }: any) {
  return (
      <button
          className={`flex h-9 w-full items-center justify-center gap-2 rounded-[3px] bg-kitsu-orange font-sans text-sm font-bold text-white transition-all hover:bg-kitsu-orange-hover disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          disabled={loading}
          {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {children}
      </button>
  );
}

// Инпут (в стиле uikit/input.tsx)
function Input({ className, ...props }: any) {
  return (
      <input
          className={`h-9 w-full rounded-[3px] border border-kitsu-s4 bg-kitsu-bg px-3 font-sans text-sm text-fg placeholder:text-fg-dim focus:border-kitsu-orange focus:outline-none transition-colors ${className}`}
          {...props}
      />
  );
}

// Лейбл
function Label({ children }: { children: React.ReactNode }) {
  return (
      <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
        {children}
      </label>
  );
}

export function CreateGuildModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const guild = await GuildController.createGuild(name.trim(), desc.trim());
      toast.success(`Гильдия «${guild.name}» создана!`);
      await GuildController.selectGuild(guild.id!);
      onClose();
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
      <Modal title="SYSTEM :: CREATE_GUILD" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div>
            <Label>Название гильдии *</Label>
            <Input
                placeholder="KitsuLAN HQ"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                onKeyDown={(e: any) => e.key === "Enter" && handleCreate()}
                autoFocus
            />
            <p className="mt-1 font-mono text-[10px] text-fg-dim">
              Уникальное имя для идентификации в сети.
            </p>
          </div>

          <div>
            <Label>Описание (Опционально)</Label>
            <Input
                placeholder="Главная база операций..."
                value={desc}
                onChange={(e: any) => setDesc(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button disabled={!name.trim() || loading} onClick={handleCreate} loading={loading}>
              СОЗДАТЬ
            </Button>
          </div>
        </div>
      </Modal>
  );
}

// Модалка вступления (Join) — аналогичный стиль
export function JoinGuildModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const guild = await GuildController.joinByInvite(code.trim());
      toast.success(`Вы вступили в «${guild.name}»!`);
      await GuildController.selectGuild(guild.id!);
      onClose();
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
      <Modal title="SYSTEM :: JOIN_GUILD" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div>
            <Label>Код приглашения</Label>
            <Input
                placeholder="XXXXXXXX-XXXX-XXXX"
                value={code}
                onChange={(e: any) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e: any) => e.key === "Enter" && handleJoin()}
                className="font-mono tracking-widest uppercase"
                autoFocus
            />
            <p className="mt-1 font-mono text-[10px] text-fg-dim">
              Введите код, полученный от администратора гильдии.
            </p>
          </div>

          <div className="pt-2">
            <Button disabled={!code.trim() || loading} onClick={handleJoin} loading={loading}>
              ВСТУПИТЬ
            </Button>
          </div>
        </div>
      </Modal>
  );
}