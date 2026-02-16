import { WailsAPI } from "@/api/wails";
import { useChatStore } from "./chatStore";

export const ChatController = {
    async loadHistory(channelID: string, beforeID?: string) {
        try {
            const messages = await WailsAPI.GetHistory(channelID, 50, beforeID || "");
            const safeMessages = messages ?? [];

            useChatStore.getState().setHistory(
                channelID,
                safeMessages,
                safeMessages.length === 50,
                !!beforeID
            );
        } catch (e) {
            console.error("[ChatController] Failed to load history:", e);
        }
    },

    async sendMessage(channelID: string, content: string) {
        try {
            // Бэкенд создаст сообщение и вернет его,
            // а также разошлет через SubscribeChannel
            await WailsAPI.SendMessage(channelID, content);
        } catch (e) {
            console.error("[ChatController] Send failed:", e);
            throw e; // Пробрасываем в UI для обработки ошибок
        }
    }
};