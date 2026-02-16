import { useEffect } from "react";
import { WailsAPI } from "@/api/wails";
import { useChatStore } from "../chatStore";

export function useChannelSubscription(channelID: string | null) {
    useEffect(() => {
        if (!channelID) return;

        let isActive = true;

        const setup = async () => {
            await WailsAPI.SubscribeChannel(channelID);

            // В Wails runtime доступен глобально или через импорт
            const runtime = (window as any).runtime;
            if (!runtime || !isActive) return;

            runtime.EventsOn("chat:message", (msg: any) => {
                if (isActive) useChatStore.getState().appendMessage(msg);
            });

            runtime.EventsOn("chat:message_deleted", (data: any) => {
                if (isActive) useChatStore.getState().removeMessage(data.channel_id, data.message_id);
            });
        };

        setup();

        return () => {
            isActive = false;
            WailsAPI.UnsubscribeChannel();
            // В Wails v2 EventsOff снимает все обработчики данного события
            (window as any).runtime?.EventsOff("chat:message");
            (window as any).runtime?.EventsOff("chat:message_deleted");
        };
    }, [channelID]);
}