import { toast } from "sonner";
import { Button } from "../../../../uikit/button";
import { Input } from "../../../../uikit/input";
import { Modal } from "@/components/modals/Modal";
import { useGuildActions } from "@/modules/guilds/guildStore";
import { useState } from "react";

// ── Диалог создания гильдии ───────────────────────────────────────────────

export function CreateGuildModal({ onClose }: { onClose: () => void }) {
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

export function JoinGuildModal({ onClose }: { onClose: () => void }) {
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
