import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/uikit/lib/utils";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // Для кастомной ширины
}

export function Modal({ title, onClose, children, className }: ModalProps) {
  // Закрытие по Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
      // Оверлей: жесткий, темный (bg-black/80), с блюром
      <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
          onClick={onClose}
      >
        {/* Окно: жесткие границы, фон s1, без тени (или жесткая тень) */}
        <div
            className={cn(
                "w-full max-w-[420px] overflow-hidden rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 shadow-2xl animate-in zoom-in-95 duration-200",
                className
            )}
            onClick={(e) => e.stopPropagation()}
        >
          {/* Хедер: моноширинный, технический вид */}
          <div className="flex h-10 items-center justify-between border-b border-kitsu-s4 bg-kitsu-s2 px-4">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-fg-dim">
              {title}
            </h2>
            <button
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded-[2px] text-fg-muted hover:bg-kitsu-dnd/10 hover:text-kitsu-dnd transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Контент */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
  );
}