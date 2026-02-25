import { Modal } from "@/components/modals/Modal";
import { Keyboard } from "lucide-react";
import React from "react";

const SHORTCUTS = [
    { keys: ["Ctrl", "K"], desc: "Поиск каналов (Command Palette)" },
    { keys: ["Ctrl", "B"], desc: "Скрыть/Показать боковую панель" }, // Реализуем ниже
    { keys: ["Esc"], desc: "Закрыть модальное окно / Очистить ввод" },
    { keys: ["Enter"], desc: "Отправить сообщение" },
    { keys: ["Shift", "Enter"], desc: "Перенос строки" },
    { keys: ["?"], desc: "Открыть эту справку" },
];

function Key({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="min-w-[24px] rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-fg shadow-sm">
            {children}
        </kbd>
    );
}

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
    return (
        <Modal title="SYSTEM :: KEYBOARD_MAP" onClose={onClose} className="max-w-[500px]">
            <div className="flex items-center gap-3 border-b border-kitsu-s4 pb-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-kitsu-s2 text-fg-dim">
                    <Keyboard size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-fg">Keyboard Shortcuts</h3>
                    <p className="font-mono text-xs text-fg-dim">Efficiency protocols optimized.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-1">
                {SHORTCUTS.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-[3px] px-2 py-2 hover:bg-kitsu-s2">
                        <span className="text-xs text-fg-muted">{item.desc}</span>
                        <div className="flex items-center gap-1">
                            {item.keys.map(k => <Key key={k}>{k}</Key>)}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
}