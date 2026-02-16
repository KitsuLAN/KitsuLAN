import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/uikit/button";
import { Modal } from "@/components/modals/Modal";
import { useGuildActions } from "@/modules/guilds/guildStore";
import { CHANNEL_TYPE_TEXT, CHANNEL_TYPE_VOICE } from "@/api/wails";
import { cn } from "@/uikit/lib/utils";

export function CreateChannelModal({
  guildID,
  onClose,
}: {
  guildID: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<1 | 2>(CHANNEL_TYPE_TEXT);
  const [loading, setLoading] = useState(false);
  const { createChannel, selectChannel } = useGuildActions();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const ch = await createChannel(
        guildID,
        name.trim().toLowerCase().replace(/\s+/g, "-"),
        type
      );
      toast.success(`Канал #${ch.name} создан`);
      if (type === CHANNEL_TYPE_TEXT) selectChannel(ch.id!);
      onClose();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Создать канал" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {([CHANNEL_TYPE_TEXT, CHANNEL_TYPE_VOICE] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg border py-3 text-sm transition-colors",
                type === t
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-kitsu-s4 bg-kitsu-bg text-muted-foreground hover:bg-kitsu-s2"
              )}
            >
              <span className="text-xl">
                {t === CHANNEL_TYPE_TEXT ? "#" : "🔊"}
              </span>
              <span className="text-xs font-semibold">
                {t === CHANNEL_TYPE_TEXT ? "Текстовый" : "Голосовой"}
              </span>
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Название
          </label>
          <div className="flex items-center rounded-md border border-kitsu-s4 bg-kitsu-bg px-3">
            <span className="mr-1 text-muted-foreground">
              {type === CHANNEL_TYPE_TEXT ? "#" : "🔊"}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="мой-канал"
              autoFocus
              className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        <Button disabled={!name.trim() || loading} onClick={handleCreate}>
          {loading ? "Создаём…" : "Создать канал"}
        </Button>
      </div>
    </Modal>
  );
}
