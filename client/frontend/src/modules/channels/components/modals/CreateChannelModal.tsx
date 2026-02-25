import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modals/Modal";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { CHANNEL_TYPE_TEXT, CHANNEL_TYPE_VOICE } from "@/api/wails";
import { cn } from "@/uikit/lib/utils";
import { GuildController } from "@/modules/guilds/GuildController";
import { Hash, Volume2 } from "lucide-react";

export function CreateChannelModal({ guildID, onClose }: { guildID: string; onClose: () => void; }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<1 | 2>(CHANNEL_TYPE_TEXT);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const ch = await GuildController.createChannel(
          guildID,
          name.trim().toLowerCase().replace(/\s+/g, "-"),
          type
      );
      toast.success(`CHANNEL INITIALIZED: #${ch.name}`);
      if (type === CHANNEL_TYPE_TEXT) await GuildController.selectChannel(ch.id!);
      onClose();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
      <Modal title="SYSTEM :: NEW_CHANNEL" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">Channel Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                  onClick={() => setType(CHANNEL_TYPE_TEXT)}
                  className={cn(
                      "flex flex-col items-center gap-2 rounded-[3px] border border-kitsu-s4 bg-kitsu-bg py-4 transition-all hover:bg-kitsu-s0",
                      type === CHANNEL_TYPE_TEXT && "border-kitsu-orange bg-kitsu-orange-dim text-kitsu-orange ring-1 ring-kitsu-orange"
                  )}
              >
                <Hash size={20} />
                <span className="font-mono text-xs font-bold uppercase">Text</span>
              </button>
              <button
                  onClick={() => setType(CHANNEL_TYPE_VOICE)}
                  className={cn(
                      "flex flex-col items-center gap-2 rounded-[3px] border border-kitsu-s4 bg-kitsu-bg py-4 transition-all hover:bg-kitsu-s0",
                      type === CHANNEL_TYPE_VOICE && "border-kitsu-orange bg-kitsu-orange-dim text-kitsu-orange ring-1 ring-kitsu-orange"
                  )}
              >
                <Volume2 size={20} />
                <span className="font-mono text-xs font-bold uppercase">Voice</span>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
              Frequency Name
            </label>
            <div className="relative">
             <span className="absolute left-3 top-2.5 text-fg-dim font-mono text-sm">
                 {type === CHANNEL_TYPE_TEXT ? <Hash size={14} /> : <Volume2 size={14} />}
             </span>
              <Input
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  onKeyDown={(e: any) => e.key === "Enter" && handleCreate()}
                  placeholder="general-chatter"
                  className="pl-7"
                  autoFocus
              />
            </div>
          </div>

          <div className="pt-2">
            <Button disabled={!name.trim() || loading} onClick={handleCreate} loading={loading} className="w-full">
              INITIALIZE
            </Button>
          </div>
        </div>
      </Modal>
  );
}