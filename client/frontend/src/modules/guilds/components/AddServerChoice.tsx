// Компонент выбора действия (Create vs Join)
import {Modal} from "@/components/modals/Modal";
import {cn} from "@/uikit/lib/utils";
import {Hash, Plus} from "lucide-react";

export function AddServerChoice({onSelect, onClose}: {
    onSelect: (mode: "create" | "join") => void;
    onClose: () => void
}) {
    return (
        <Modal title="SYSTEM :: ADD_CONNECTION" onClose={onClose} className="max-w-[400px]">
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => onSelect("create")}
                    className={cn(
                        "group flex flex-col items-center gap-3 rounded-[3px] border border-kitsu-s4 bg-kitsu-bg py-6 transition-all",
                        "hover:border-kitsu-orange hover:bg-kitsu-s0"
                    )}
                >
                    <div
                        className="flex size-10 items-center justify-center rounded-full bg-kitsu-s2 text-fg-dim transition-colors group-hover:bg-kitsu-orange group-hover:text-white">
                        <Plus size={20}/>
                    </div>
                    <div className="text-center">
                        <div className="font-mono text-xs font-bold uppercase tracking-widest text-fg">Create</div>
                        <div className="mt-1 font-mono text-xs text-fg-dim">NEW GUILD</div>
                    </div>
                </button>

                <button
                    onClick={() => onSelect("join")}
                    className={cn(
                        "group flex flex-col items-center gap-3 rounded-[3px] border border-kitsu-s4 bg-kitsu-bg py-6 transition-all",
                        "hover:border-kitsu-orange hover:bg-kitsu-s0"
                    )}
                >
                    <div
                        className="flex size-10 items-center justify-center rounded-full bg-kitsu-s2 text-fg-dim transition-colors group-hover:bg-kitsu-orange group-hover:text-white">
                        <Hash size={20}/>
                    </div>
                    <div className="text-center">
                        <div className="font-mono text-xs font-bold uppercase tracking-widest text-fg">Join</div>
                        <div className="mt-1 font-mono text-xs text-fg-dim">INVITE CODE</div>
                    </div>
                </button>
            </div>
        </Modal>
    );
}