import { useState } from "react";
import { Button } from "@/uikit/button";
import { CreateGuildModal, JoinGuildModal } from "@/modules/guilds/components/modals/GuildModal";
import { useGuilds } from "@/modules/guilds/guildStore";
import { GuildController } from "@/modules/guilds/GuildController";
import { Activity, Plus, Hash } from "lucide-react";

type ModalType = "create" | "join" | null;

export default function Home() {
    const guilds = useGuilds();
    const [modal, setModal] = useState<ModalType>(null);

    return (
        <>
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-kitsu-bg text-fg">

                {/* Large Decorative Icon */}
                <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[3px] border border-dashed border-kitsu-s4 bg-kitsu-s1 text-6xl opacity-50 grayscale transition-all hover:border-kitsu-orange/50 hover:grayscale-0 hover:opacity-100">
                    🦊
                </div>

                <h1 className="mb-2 font-mono text-2xl font-bold uppercase tracking-widest text-fg">
                    System Standby
                </h1>

                {guilds.length === 0 ? (
                    <p className="mb-8 max-w-sm font-sans text-sm text-fg-muted">
                        Связь с гильдиями отсутствует. Инициируйте новое соединение или присоединитесь к существующему узлу.
                    </p>
                ) : (
                    <p className="mb-8 max-w-sm font-sans text-sm text-fg-muted">
                        Терминал готов к работе. Выберите активный канал в левой панели для начала передачи данных.
                    </p>
                )}

                <div className="flex gap-4">
                    <Button onClick={() => setModal("create")}>
                        <Plus size={16} /> Создать гильдию
                    </Button>
                    <Button variant="outline" onClick={() => setModal("join")}>
                        <Hash size={16} /> Вступить по коду
                    </Button>
                </div>

                {/* Stats / Footer */}
                <div className="mt-16 flex items-center gap-8 border-t border-kitsu-s4 pt-6 opacity-60">
                    <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-[10px] text-fg-dim uppercase tracking-widest">Guilds</span>
                        <span className="font-mono text-xl font-bold text-fg">{guilds.length}</span>
                    </div>
                    <div className="h-8 w-px bg-kitsu-s4" />
                    <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-[10px] text-fg-dim uppercase tracking-widest">Status</span>
                        <div className="flex items-center gap-1.5">
                     <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kitsu-online opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-kitsu-online"></span>
                     </span>
                            <span className="font-mono text-xs font-bold text-kitsu-online">ONLINE</span>
                        </div>
                    </div>
                </div>

            </div>

            {modal === "create" && <CreateGuildModal onClose={() => setModal(null)} />}
            {modal === "join" && <JoinGuildModal onClose={() => setModal(null)} />}
        </>
    );
}