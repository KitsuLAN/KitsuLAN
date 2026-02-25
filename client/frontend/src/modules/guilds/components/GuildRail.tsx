import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {GuildController} from "@/modules/guilds/GuildController";
import {useActiveGuildID, useGuilds} from "@/modules/guilds/guildStore";
import {NavIcon} from "@/uikit/nav-icon";
import {CreateGuildModal, JoinGuildModal} from "@/modules/guilds/components/modals/GuildModal";
import {Plus} from "lucide-react";
import FoxLogo from "@/assets/images/logo-kitsu.svg";
import {AddServerChoice} from "@/modules/guilds/components/AddServerChoice";

export function GuildRail() {
    const guilds = useGuilds();
    const activeGuildID = useActiveGuildID();
    const navigate = useNavigate();

    // Состояние для управления модалками
    const [modal, setModal] = useState<"choice" | "create" | "join" | null>(null);

    return (
        <>
            <nav className="flex w-[72px] min-w-[72px] shrink-0 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden border-r border-kitsu-s4 bg-kitsu-s0 py-3">
                <button
                    onClick={() => { GuildController.clearSelection(); navigate("/app/home"); }}
                    className="mb-2 flex h-10 w-10 shrink-0 items-center justify-center transition-opacity hover:opacity-80"
                    title="Главная"
                >
                    <img src={FoxLogo} alt="KitsuLAN" className="h-8 w-8" />
                </button>

                <div className="my-1 h-px w-10 bg-kitsu-s4" />

                {guilds.map((g) => (
                    <NavIcon
                        key={g.id}
                        active={activeGuildID === g.id}
                        label={(g.name ?? "?").slice(0, 2).toUpperCase()}
                        color={g.color}
                        title={g.name}
                        onClick={() => navigate(`/app/${g.id}`)}
                    />
                ))}

                <div className="my-1 h-px w-10 bg-kitsu-s4" />

                {/* Теперь кнопка открывает меню выбора */}
                <button
                    onClick={() => setModal("choice")}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-dashed border-kitsu-orange/35 text-kitsu-orange transition-colors hover:border-kitsu-orange hover:bg-kitsu-orange-dim"
                    title="Добавить сервер"
                >
                    <Plus size={20} strokeWidth={1.5} />
                </button>
            </nav>

            {/* Рендеринг модалок */}
            {modal === "choice" && (
                <AddServerChoice
                    onSelect={(m) => setModal(m)}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === "create" && (
                <CreateGuildModal onClose={() => setModal(null)} />
            )}
            {modal === "join" && (
                <JoinGuildModal onClose={() => setModal(null)} />
            )}
        </>
    );
}