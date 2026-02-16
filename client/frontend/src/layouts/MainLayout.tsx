import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Separator } from "@/uikit/separator";
import { GuildRail } from "@/modules/guilds/components/GuildRail";
import { ChannelPanel } from "@/modules/channels/components/ChannelPanel";
import { MemberList } from "@/modules/guilds/components/MemberList";

// Импортируем контроллер и данные
import { GuildController } from "@/modules/guilds/GuildController";
import {
  useGuilds,
  useActiveGuildID,
  useActiveChannelID,
  useActiveChannels
} from "@/modules/guilds/guildStore";

export default function MainLayout() {
  // 1. Инициализация
  useEffect(() => {
    GuildController.loadUserGuilds();
  }, []);

  // 2. Подписка на данные для отрисовки хедера
  const guilds = useGuilds();
  const activeGuildID = useActiveGuildID();
  const activeChannelID = useActiveChannelID();
  const channels = useActiveChannels();

  // Находим объекты для отображения имен (View Logic)
  const activeGuild = guilds.find((g) => g.id === activeGuildID);
  const activeChannel = channels.find((c) => c.id === activeChannelID);

  return (
      <div className="flex h-screen w-screen overflow-hidden bg-kitsu-bg text-foreground">
        {/* Левая панель - Гильдии */}
        <GuildRail />

        {/* Панель каналов выбранной гильдии */}
        <ChannelPanel />

        <main className="flex flex-1 flex-col overflow-hidden bg-kitsu-bg">
          {/* Шапка чата */}
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 px-4">
            <span className="text-lg text-muted-foreground">#</span>
            <span className="font-semibold text-sm">
            {activeChannel?.name ?? "—"}
          </span>

            {activeGuild && (
                <>
                  <Separator orientation="vertical" className="h-5 bg-kitsu-s4" />
                  <span className="text-sm text-muted-foreground">
                {activeGuild.name}
              </span>
                </>
            )}
          </header>

          {/* Область контента (страница Chat или Home) */}
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
        </main>

        {/* Список участников */}
        <MemberList />
      </div>
  );
}