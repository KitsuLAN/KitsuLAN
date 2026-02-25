import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modals/Modal";
import { GuildController } from "@/modules/guilds/GuildController";
import { handleApiError } from "@/api/errors";
import { Copy, Check, Loader2 } from "lucide-react";

export function InviteModal({ guildID, onClose }: { guildID: string; onClose: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    GuildController.createInvite(guildID, 0, 0)
        .then(setCode)
        .catch((e) => { handleApiError(e); onClose(); })
        .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Код скопирован в буфер обмена");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
      <Modal title="ACCESS :: GENERATE_INVITE" onClose={onClose}>
        {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-fg-dim">
              <Loader2 className="animate-spin" size={24} />
              <span className="font-mono text-xs">GENERATING KEY...</span>
            </div>
        ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-fg-muted leading-relaxed">
                Этот код доступа позволяет новым пользователям подключиться к гильдии. Он действует бессрочно.
              </p>

              <button
                  onClick={handleCopy}
                  className="group relative flex w-full items-center justify-between rounded-[3px] border border-kitsu-s4 bg-kitsu-bg px-4 py-3 transition-all hover:border-kitsu-orange hover:bg-kitsu-s0"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-mono text-[10px] font-bold text-fg-dim uppercase tracking-widest">INVITE CODE</span>
                  <span className="font-mono text-lg font-bold tracking-widest text-fg group-hover:text-kitsu-orange transition-colors">
                 {code}
               </span>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-kitsu-s2 text-fg-muted transition-colors group-hover:bg-kitsu-orange group-hover:text-white">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </div>
              </button>

              <p className="text-center font-mono text-[10px] text-fg-dim">
                CLICK TO COPY TO CLIPBOARD
              </p>
            </div>
        )}
      </Modal>
  );
}