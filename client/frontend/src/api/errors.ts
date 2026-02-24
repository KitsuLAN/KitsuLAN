import { toast } from "sonner";

export interface KitsuError {
    message: string;
    code: string;
    remedy?: string;
}

export function parseWailsError(err: unknown): KitsuError {
    const message = String(err);

    // Парсим формат "[CODE] Message (op: OP) -> internal"
    const codeMatch = message.match(/^\[([A-Z0-9_]+)\]/);
    const code = codeMatch ? codeMatch[1] : "UNKNOWN_ERROR";

    // Пытаемся вычленить чистое сообщение без тех. деталей
    const cleanMessage = message.split("(op:")[0].replace(/^\[[A-Z0-9_]+\]\s*/, "").trim();

    return {
        code: code,
        message: cleanMessage || "Произошла непредвиденная ошибка",
        remedy: message.includes("remedy:") ? message.split("remedy:")[1].trim() : undefined
    };
}

// Единая функция для вывода ошибок в UI
export function handleApiError(err: unknown) {
    const parsed = parseWailsError(err);

    // Игнорируем показ тоста, если это просто "Not Found" при фоновых запросах (опционально)
    if (parsed.code === "NOT_FOUND") return parsed;

    toast.error(`Ошибка: ${parsed.message}`, {
        description: parsed.remedy,
        duration: 5000,
    });

    return parsed;
}