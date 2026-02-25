import { useEffect, useState } from "react";
import { useLayoutStore } from "@/modules/layout/layoutStore";
import { ShortcutsModal } from "@/components/modals/ShortcutsModal";

export function GlobalShortcuts() {
    const [showHelp, setShowHelp] = useState(false);
    const { toggleChannels } = useLayoutStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Игнорируем ввод в текстовые поля
            const target = e.target as HTMLElement;
            if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
                return;
            }

            // 'Shift + ?' -> Справка
            if (e.key === "?" && e.shiftKey) {
                e.preventDefault();
                setShowHelp(true);
            }

            // 'Ctrl + B' -> Свернуть/Развернуть боковую панель
            if ((e.ctrlKey || e.metaKey) && e.key === "b") {
                e.preventDefault();
                toggleChannels();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleChannels]);

    return showHelp ? <ShortcutsModal onClose={() => setShowHelp(false)} /> : null;
}