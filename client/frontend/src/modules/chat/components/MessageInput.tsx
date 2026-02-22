/**
 * src/modules/chat/components/MessageInput.tsx
 *
 * Адаптация TextareaInputField + ChannelTextareaContent из Fluxer.
 * Убраны: autocomplete, emoji picker, MobX, slowmode.
 * Оставлены: auto-resize, Enter/Shift+Enter, disabled state, placeholder.
 */

import { useCallback, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/uikit/lib/utils";
import { ChatController } from "@/modules/chat/ChatController";

interface MessageInputProps {
    channelId: string;
    channelName?: string;
    disabled?: boolean;
}

export function MessageInput({ channelId, channelName, disabled }: MessageInputProps) {
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const placeholder = channelName
        ? `Написать в #${channelName}…`
        : "Написать сообщение…";

    /** Авторесайз textarea — прямая порт логики из Fluxer */
    const handleInput = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        // Ограничиваем максимум ~5 строк (~120px)
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, []);

    const send = useCallback(async () => {
        const content = draft.trim();
        if (!content || sending || disabled) return;

        setSending(true);
        try {
            await ChatController.sendMessage(channelId, content);
            setDraft("");
            // Сбрасываем высоту после очистки
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        } catch {
            // Ошибка уже логируется в ChatController
            // Можно добавить toast, если нужно
        } finally {
            setSending(false);
            // Возвращаем фокус на textarea после отправки
            textareaRef.current?.focus();
        }
    }, [draft, sending, disabled, channelId]);

    /** Адаптация handleKeyDown из TextareaInputField */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Enter — отправка, Shift+Enter — перенос строки
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        },
        [send],
    );

    const isDisabled = disabled || sending;
    const canSend = draft.trim().length > 0 && !isDisabled;

    return (
        <div className="shrink-0 px-4 pb-4 pt-2">
            <div
                className={cn(
                    "flex items-end gap-2 rounded-lg border bg-kitsu-s2 px-3 py-2.5",
                    "transition-colors",
                    isDisabled
                        ? "border-kitsu-s3 opacity-60"
                        : "border-kitsu-s4 focus-within:border-primary/40",
                )}
            >
                {/* Textarea — авторесайз */}
                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isDisabled}
                    rows={1}
                    spellCheck
                    aria-label="Поле ввода сообщения"
                    className={cn(
                        "min-h-[20px] max-h-[120px] min-w-0 flex-1 resize-none bg-transparent",
                        "py-0.5 text-sm leading-[1.375rem] outline-none",
                        "placeholder:text-muted-foreground/50",
                        "scrollbar-none", // убираем скроллбар если текст переполняет
                    )}
                />

                {/* Кнопка отправки */}
                <button
                    onClick={send}
                    disabled={!canSend}
                    aria-label="Отправить"
                    className={cn(
                        "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        "transition-all duration-150",
                        canSend
                            ? "bg-primary text-white hover:bg-primary/80"
                            : "bg-kitsu-s3 text-muted-foreground/40 cursor-not-allowed",
                    )}
                >
                    <Send className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Подсказка Shift+Enter */}
            <p className="mt-1 px-1 text-[10px] text-muted-foreground/30">
                Enter — отправить · Shift+Enter — перенос строки
            </p>
        </div>
    );
}