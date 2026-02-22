/**
 * src/modules/chat/utils/messageGrouping.ts
 */

import type { ChatMessage } from "@/api/wails";
import { timestampPbToISO } from "@/api/wails";

/** Максимальная пауза между сообщениями для объединения в группу — 7 минут */
const MESSAGE_GROUP_TIMEOUT_MS = 7 * 60 * 1000;

export interface MessageGroup {
    /** Ключ группы — id первого сообщения */
    groupId: string;
    /** Все сообщения в группе */
    messages: ChatMessage[];
    /** Показывать ли разделитель даты перед этой группой */
    dateDivider?: string;
}

/**
 * Проверяет, нужно ли начинать новую группу сообщений.
 */
function isNewGroup(prev: ChatMessage, current: ChatMessage): boolean {
    // Разные авторы
    if (prev.author_id !== current.author_id) return true;

    const prevISO = timestampPbToISO(prev.created_at);
    const currISO = timestampPbToISO(current.created_at);

    if (!prevISO || !currISO) return true;

    const prevDate = new Date(prevISO);
    const currDate = new Date(currISO);

    // Разные дни — всегда новая группа
    if (
        prevDate.getFullYear() !== currDate.getFullYear() ||
        prevDate.getMonth() !== currDate.getMonth() ||
        prevDate.getDate() !== currDate.getDate()
    ) {
        return true;
    }

    // Слишком большой разрыв по времени
    const timeDiff = currDate.getTime() - prevDate.getTime();
    return timeDiff > MESSAGE_GROUP_TIMEOUT_MS;


}

/**
 * Форматирует дату для разделителя.
 * Сегодня → "Сегодня", вчера → "Вчера", иначе → "дд.мм.гггг"
 */
function formatDateDivider(iso: string): string {
    const date = new Date(iso);
    const now = new Date();

    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (sameDay(date, now)) return "Сегодня";

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (sameDay(date, yesterday)) return "Вчера";

    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

/**
 * Основная функция — принимает плоский список сообщений,
 * возвращает список MessageGroup с датовыми разделителями.
 *
 * Сообщения должны быть отсортированы по времени (от старых к новым).
 */
export function groupMessages(messages: ChatMessage[]): MessageGroup[] {
    if (messages.length === 0) return [];

    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;
    let lastDateDivider: string | null = null;

    for (const msg of messages) {
        const iso = timestampPbToISO(msg.created_at);
        const dateDivider = iso ? formatDateDivider(iso) : null;

        // Определяем нужен ли разделитель даты
        const needsDateDivider = dateDivider && dateDivider !== lastDateDivider;
        if (needsDateDivider) {
            lastDateDivider = dateDivider;
        }

        // Нужно ли начать новую группу?
        const startNewGroup =
            !currentGroup ||
            needsDateDivider ||
            isNewGroup(currentGroup.messages[currentGroup.messages.length - 1], msg);

        if (startNewGroup) {
            currentGroup = {
                groupId: msg.id!,
                messages: [msg],
                dateDivider: needsDateDivider ? dateDivider! : undefined,
            };
            groups.push(currentGroup);
        } else {
            currentGroup!.messages.push(msg);
        }
    }

    return groups;
}