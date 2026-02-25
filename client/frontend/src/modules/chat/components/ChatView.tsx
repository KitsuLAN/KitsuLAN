/**
 * src/modules/chat/components/ChatView.tsx
 *
 * Корневой компонент чата — собирает MessageList + MessageInput.
 * Получает channelId и channelName, остальное тянет из сторов.
 *
 * Использование:
 *   <ChatView channelId="abc123" channelName="general" />
 */

import { useActiveChannels } from "@/modules/guilds/guildStore";
import { useUsername } from "@/modules/auth/authStore";
import { useChatMessages, useChatHasMore } from "@/modules/chat/chatStore";
import { useChannelSubscription } from "@/modules/chat/hooks/useChannelSubscription";
import { ChatController } from "@/modules/chat/ChatController";
import { ChannelHeader } from "@/modules/channels/components/ChannelHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import {ChannelStatusBar} from "@/modules/channels/components/ChannelStatusBar";

interface ChatViewProps {
    channelId: string;
}

export function ChatView({ channelId }: ChatViewProps) {
    // Данные из сторов
    const messages = useChatMessages(channelId);
    const hasMore = useChatHasMore(channelId);
    const currentUsername = useUsername() ?? "";

    // Имя канала для placeholder и EmptyState
    const channels = useActiveChannels();
    const channel = channels.find((c) => c.id === channelId);

    // Real-time подписка на сообщения через Wails события
    useChannelSubscription(channelId);

    const handleLoadMore = () => {
        // Грузим историю до самого старого сообщения
        ChatController.loadHistory(channelId, messages[0]?.id);
    };

    return (
        <div className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-kitsu-bg">
            {/* Хедер канала */}
            <ChannelHeader channelId={channelId} />
            <ChannelStatusBar channelId={channelId} />

            {/* Лента сообщений */}
            <MessageList
                messages={messages}
                currentUsername={currentUsername}
                hasMore={hasMore}
                channelName={channel?.name}
                onLoadMore={handleLoadMore}
            />

            {/* Поле ввода */}
            <MessageInput channelId={channelId} channelName={channel?.name} />
        </div>
    );
}