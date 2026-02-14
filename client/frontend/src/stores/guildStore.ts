/**
 * src/stores/guildStore.ts
 *
 * Состояние гильдий, каналов и участников.
 * Активная гильдия и канал не персистятся — восстанавливаются при запуске.
 */
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { WailsAPI } from "@/lib/wails";
import type { Guild, Channel, Member } from "@/lib/wails";

interface GuildState {
  guilds: Guild[];
  activeGuildID: string | null;
  // Каналы и участники кешируются по guildID
  channelsByGuild: Record<string, Channel[]>;
  membersByGuild: Record<string, Member[]>;
  activeChannelID: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadGuilds: () => Promise<void>;
  selectGuild: (guildID: string) => Promise<void>;
  selectChannel: (channelID: string) => void;
  clearSelection: () => void;
  createGuild: (name: string, description: string) => Promise<Guild>;
  joinByInvite: (code: string) => Promise<Guild>;
  leaveGuild: (guildID: string) => Promise<void>;
  deleteGuild: (guildID: string) => Promise<void>;
  createChannel: (
    guildID: string,
    name: string,
    type: number
  ) => Promise<Channel>;
  createInvite: (
    guildID: string,
    maxUses: number,
    expiresInHours: number
  ) => Promise<string>;
}

export const useGuildStore = create<GuildState>()((set, get) => ({
  guilds: [],
  activeGuildID: null,
  channelsByGuild: {},
  membersByGuild: {},
  activeChannelID: null,
  loading: false,
  error: null,

  loadGuilds: async () => {
    set({ loading: true, error: null });
    try {
      const guilds = await WailsAPI.ListMyGuilds();
      set({ guilds: guilds ?? [], loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  // Выбор гильдии подгружает каналы и участников (если ещё не загружены)
  selectGuild: async (guildID) => {
    set({ activeGuildID: guildID, activeChannelID: null });
    const { channelsByGuild, membersByGuild } = get();

    try {
      const [channels, members] = await Promise.all([
        channelsByGuild[guildID]
          ? Promise.resolve(channelsByGuild[guildID])
          : WailsAPI.ListChannels(guildID),
        membersByGuild[guildID]
          ? Promise.resolve(membersByGuild[guildID])
          : WailsAPI.ListMembers(guildID),
      ]);

      set((s) => ({
        channelsByGuild: { ...s.channelsByGuild, [guildID]: channels ?? [] },
        membersByGuild: { ...s.membersByGuild, [guildID]: members ?? [] },
      }));

      // Автовыбор первого текстового канала
      const firstText = (channels ?? []).find((c) => c.type === 1);
      if (firstText) set({ activeChannelID: firstText.id });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  selectChannel: (channelID) => set({ activeChannelID: channelID }),

  clearSelection: () => set({ activeGuildID: null, activeChannelID: null }),

  createGuild: async (name, description) => {
    const guild = await WailsAPI.CreateGuild(name, description);
    set((s) => ({ guilds: [...s.guilds, guild] }));
    return guild;
  },

  joinByInvite: async (code) => {
    const guild = await WailsAPI.JoinByInvite(code);
    set((s) => ({
      guilds: s.guilds.find((g) => g.id === guild.id)
        ? s.guilds
        : [...s.guilds, guild],
    }));
    return guild;
  },

  leaveGuild: async (guildID) => {
    await WailsAPI.LeaveGuild(guildID);
    set((s) => ({
      guilds: s.guilds.filter((g) => g.id !== guildID),
      activeGuildID: s.activeGuildID === guildID ? null : s.activeGuildID,
      activeChannelID: s.activeGuildID === guildID ? null : s.activeChannelID,
    }));
  },

  deleteGuild: async (guildID) => {
    await WailsAPI.DeleteGuild(guildID);
    set((s) => ({
      guilds: s.guilds.filter((g) => g.id !== guildID),
      activeGuildID: s.activeGuildID === guildID ? null : s.activeGuildID,
      activeChannelID: s.activeGuildID === guildID ? null : s.activeChannelID,
    }));
  },

  createChannel: async (guildID, name, type) => {
    const channel = await WailsAPI.CreateChannel(guildID, name, type);
    set((s) => ({
      channelsByGuild: {
        ...s.channelsByGuild,
        [guildID]: [...(s.channelsByGuild[guildID] ?? []), channel],
      },
    }));
    return channel;
  },

  createInvite: (guildID, maxUses, expiresInHours) =>
    WailsAPI.CreateInvite(guildID, maxUses, expiresInHours),
}));

// Селекторы
export const useGuilds = () => useGuildStore(useShallow((s) => s.guilds));
export const useActiveGuildID = () => useGuildStore((s) => s.activeGuildID);
export const useActiveChannelID = () => useGuildStore((s) => s.activeChannelID);

export const useActiveChannels = () =>
  useGuildStore(
    useShallow((s) =>
      s.activeGuildID ? s.channelsByGuild[s.activeGuildID] ?? [] : []
    )
  );

export const useActiveMembers = () =>
  useGuildStore(
    useShallow((s) =>
      s.activeGuildID ? s.membersByGuild[s.activeGuildID] ?? [] : []
    )
  );

export const useGuildActions = () =>
  useGuildStore(
    useShallow((s) => ({
      loadGuilds: s.loadGuilds,
      selectGuild: s.selectGuild,
      selectChannel: s.selectChannel,
      clearSelection: s.clearSelection,
      createGuild: s.createGuild,
      joinByInvite: s.joinByInvite,
      leaveGuild: s.leaveGuild,
      deleteGuild: s.deleteGuild,
      createChannel: s.createChannel,
      createInvite: s.createInvite,
    }))
  );
