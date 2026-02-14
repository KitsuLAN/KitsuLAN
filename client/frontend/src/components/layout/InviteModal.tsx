import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/layout/Modal";
import { useGuildActions } from "@/stores/guildStore";

export function InviteModal({
  guildID,
  onClose,
}: {
  guildID: string;
  onClose: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { createInvite } = useGuildActions();

  useEffect(() => {
    createInvite(guildID, 0, 0)
      .then(setCode)
      .catch((e) => {
        toast.error(String(e));
        onClose();
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal title="Пригласить участников" onClose={onClose}>
      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Генерируем код…
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Поделитесь этим кодом. Он действует бессрочно.
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code!);
              toast.success("Код скопирован!");
            }}
            className="flex items-center justify-between rounded-lg border border-kitsu-s4 bg-kitsu-bg px-4 py-3 font-mono text-lg font-bold tracking-widest text-foreground hover:bg-kitsu-s2 transition-colors"
          >
            {code}
            <span className="font-sans text-xs font-normal text-muted-foreground">
              нажмите чтобы скопировать
            </span>
          </button>
        </div>
      )}
    </Modal>
  );
}
