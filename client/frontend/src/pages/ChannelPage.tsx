/**
 * src/pages/ChannelPage.tsx
 */

import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { GuildController } from "@/modules/guilds/GuildController";
import { GuildWelcome } from "@/modules/guilds/components/GuildWelcome";
import { ChatView } from "@/modules/chat/components/ChatView";

export default function ChannelPage() {
    const { guildId, channelId } = useParams<{
        guildId: string;
        channelId: string;
    }>();

    // Синхронизируем URL с состоянием сторов
    useEffect(() => {
        if (guildId) GuildController.selectGuild(guildId);
        if (channelId) GuildController.selectChannel(channelId);
    }, [guildId, channelId]);

    if (!guildId) return null;

    // Гильдия выбрана, но канал ещё нет — показываем welcome
    if (!channelId) return <GuildWelcome guildId={guildId} />;

    // Чат
    return <ChatView channelId={channelId} />;
}