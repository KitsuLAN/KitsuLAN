/**
 * src/layouts/MainLayout.tsx
 */

import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { GuildRail } from "@/modules/guilds/components/GuildRail";
import { MemberList } from "@/modules/guilds/components/MemberList";
import { GuildController } from "@/modules/guilds/GuildController";
import { useMembersVisible } from "@/modules/layout/layoutStore";
import { ChannelPanel } from "@/modules/channels/components/ChannelPanel";

export default function MainLayout() {
    useEffect(() => {
        GuildController.loadUserGuilds();
    }, []);

    const membersVisible = useMembersVisible();

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-kitsu-bg text-foreground">
            {/* Левая панель — гильдии */}
            <GuildRail />

            {/* Панель каналов */}
            <ChannelPanel />

            {/* Основная область — хедер живёт внутри ChatView/ChannelHeader */}
            <main className="flex flex-1 flex-col overflow-hidden bg-kitsu-bg">
                <div className="flex-1 overflow-hidden">
                    <Outlet />
                </div>
            </main>

            {/* Список участников — управляется кнопкой в ChannelHeader */}
            {membersVisible && <MemberList />}
        </div>
    );
}