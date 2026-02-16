import { useEffect, useMemo } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Separator } from "@/uikit/separator";
import { GuildRail } from "@/modules/guilds/components/GuildRail";
import { ChannelPanel } from "@/modules/channels/components/ChannelPanel";
import { MemberList } from "@/modules/guilds/components/MemberList";
import {
  useGuilds,
  useActiveGuildID,
  useActiveChannelID,
  useActiveChannels,
  useGuildActions,
} from "@/modules/guilds/guildStore";

export default function MainLayout() {
  const navigate = useNavigate();
  const guilds = useGuilds();
  const activeGuildID = useActiveGuildID();
  const activeChannelID = useActiveChannelID();
  const channels = useActiveChannels();
  const { loadGuilds, selectGuild } = useGuildActions();

  useEffect(() => {
    loadGuilds();
  }, []);

  const firstGuildId = guilds[0]?.id;
  useEffect(() => {
    if (firstGuildId && !activeGuildID) selectGuild(firstGuildId);
  }, [firstGuildId, activeGuildID]);

  const activeChannel = channels.find((c) => c.id === activeChannelID);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-kitsu-bg text-foreground">
      <GuildRail />
      <ChannelPanel />

      <main className="flex flex-1 flex-col overflow-hidden bg-kitsu-bg">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 px-4">
          <span className="text-lg text-muted-foreground">#</span>
          <span className="font-semibold text-sm">
            {activeChannel?.name ?? "—"}
          </span>
          <Separator orientation="vertical" className="h-5 bg-kitsu-s4" />
          <span className="text-sm text-muted-foreground">
            {guilds.find((g) => g.id === activeGuildID)?.name ?? ""}
          </span>
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>

      <MemberList />
    </div>
  );
}
