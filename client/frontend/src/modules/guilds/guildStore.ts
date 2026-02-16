import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Guild, Channel, Member } from "@/api/wails";

// 1. Определение структуры данных
interface GuildState {
  guilds: Guild[];
  activeGuildID: string | null;
  activeChannelID: string | null;
  channelsByGuild: Record<string, Channel[]>;
  membersByGuild: Record<string, Member[]>;
  loading: boolean;
}

// 2. Создание хранилища (БД)
export const useGuildStore = create<GuildState>(() => ({
  guilds: [],
  activeGuildID: null,
  activeChannelID: null,
  channelsByGuild: {},
  membersByGuild: {},
  loading: false,
}));

// 3. Селекторы (Геттеры для UI)
// Мы оставляем их здесь, чтобы компоненты могли "подписываться" на данные.
export const useGuilds = () => useGuildStore((s) => s.guilds);
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

export const useGuildLoading = () => useGuildStore((s) => s.loading);