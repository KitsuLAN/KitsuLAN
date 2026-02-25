import { useCallback, useRef, useState } from "react";
import { Send, Bold, Italic, Code, Link, Paperclip, Smile, TerminalSquare } from "lucide-react";
import { IconButton } from "@/uikit/icon-button";
import { ChatController } from "@/modules/chat/ChatController";
import { cn } from "@/uikit/lib/utils";

export function MessageInput({ channelId, channelName }: { channelId: string; channelName?: string; }) {
    const [draft, setDraft] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Авторесайз текстового поля
    const handleInput = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`; // Увеличили макс. высоту до 160px
    }, []);

    const send = useCallback(async () => {
        if (!draft.trim()) return;
        await ChatController.sendMessage(channelId, draft.trim());
        setDraft("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    }, [draft, channelId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="shrink-0 border-t border-kitsu-s4 bg-kitsu-s2 px-4 py-3">

            {/* Тулбар (Компактный, инженерный) */}
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <IconButton size="sm" title="Прикрепить файл (Ctrl+U)">
                        <Paperclip size={14} className="text-fg-muted hover:text-fg" />
                    </IconButton>
                    <div className="mx-1 h-3.5 w-px bg-kitsu-s4" />
                    <IconButton size="sm" title="Жирный (Ctrl+B)"><Bold size={14} /></IconButton>
                    <IconButton size="sm" title="Курсив (Ctrl+I)"><Italic size={14} /></IconButton>
                    <IconButton size="sm" title="Код (Ctrl+E)"><Code size={14} /></IconButton>
                    <IconButton size="sm" title="Ссылка (Ctrl+K)"><Link size={14} /></IconButton>
                </div>

                {/* Подсказка горячих клавиш */}
                <div className="hidden items-center gap-2 sm:flex">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-fg-dim">
                        {isFocused ? "INSERT MODE" : "COMMAND MODE"}
                    </span>
                    <TerminalSquare size={12} className={isFocused ? "text-kitsu-orange" : "text-fg-dim"} />
                </div>
            </div>

            {/* Поле ввода (Имитация командной строки) */}
            <div
                className={cn(
                    "relative flex items-end gap-2 rounded-[3px] border bg-kitsu-s1 p-2 transition-colors",
                    isFocused ? "border-kitsu-orange" : "border-kitsu-s4 hover:border-kitsu-s5"
                )}
            >
                {/* Индикатор начала строки (как в консоли) */}
                <div className="mb-1.5 ml-1 flex shrink-0 items-center text-kitsu-orange opacity-80">
                    <span className="font-mono text-sm font-bold">{">"}</span>
                </div>

                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={`Передача данных в #${channelName || "канал"}...`}
                    rows={1}
                    className="max-h-[160px] min-h-[22px] flex-1 resize-none bg-transparent py-1 font-sans text-sm leading-[1.4] text-fg outline-none placeholder:font-mono placeholder:text-xs placeholder:text-fg-dim"
                />

                <div className="flex shrink-0 items-center gap-1 mb-0.5">
                    <IconButton size="sm" title="Эмодзи">
                        <Smile size={14} className="text-fg-muted hover:text-kitsu-orange" />
                    </IconButton>

                    {/* Кнопка отправки */}
                    <button
                        onClick={send}
                        disabled={!draft.trim()}
                        className="flex h-7 items-center justify-center gap-1.5 rounded-[2px] bg-kitsu-orange px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-kitsu-orange-hover disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        SEND <Send size={10} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Футер ввода */}
            <div className="mt-1.5 flex justify-end">
                <span className="font-mono text-[9px] text-fg-dim">
                    <strong>ENTER</strong> отправить · <strong>SHIFT+ENTER</strong> перенос строки
                </span>
            </div>
        </div>
    );
}