export interface KitsuError {
    message: string;
    code?: string;
    remedy?: string;
}

export function parseWailsError(err: any): KitsuError {
    const message = String(err);

    // Парсим формат "[CODE] Message (op: OP) -> internal"
    const codeMatch = message.match(/^\[([A-Z0-9_]+)\]/);
    const code = codeMatch ? codeMatch[1] : "UNKNOWN_ERROR";

    // Пытаемся вычленить чистое сообщение без тех. деталей для юзера
    const cleanMessage = message.split("(op:")[0].replace(/^\[[A-Z0-9_]+\]\s*/, "");

    return {
        code: code,
        message: cleanMessage || "Произошла непредвиденная ошибка",
        // Remedy можно передавать в теле сообщения или через доп. поле в будущем
        remedy: message.includes("remedy:") ? message.split("remedy:")[1] : undefined
    };
}