import {
    Info,
    Loader2,
    AlertTriangle,
    CheckSquare,
    XSquare
} from "lucide-react";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
    return (
        <Sonner
            theme="dark"
            className="toaster group"
            toastOptions={{
                // Полностью переопределяем классы через Tailwind
                className: "group flex w-full items-start gap-3 rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 p-4 text-fg shadow-2xl font-mono text-xs",
                descriptionClassName: "font-mono text-[10px] text-fg-dim mt-1",
                // Убираем дефолтные стили
                style: {
                    backgroundColor: 'var(--kitsu-s1)',
                    borderColor: 'var(--kitsu-s4)',
                    color: 'var(--fg)',
                    borderRadius: '3px',
                }
            }}
            icons={{
                success: <CheckSquare className="size-4 text-kitsu-online" />,
                info: <Info className="size-4 text-kitsu-orange" />,
                warning: <AlertTriangle className="size-4 text-kitsu-away" />,
                error: <XSquare className="size-4 text-kitsu-dnd" />,
                loading: <Loader2 className="size-4 animate-spin text-fg-dim" />,
            }}
            {...props}
        />
    );
};

export { Toaster };