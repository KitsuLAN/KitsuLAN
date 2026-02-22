/**
 * src/modules/layout/layoutStore.ts
 *
 * Глобальный стор состояния UI-раскладки.
 * Не персистируется — сбрасывается при перезапуске приложения.
 *
 * Сюда попадает только то, что влияет на layout/видимость панелей.
 * Бизнес-данные (каналы, гильдии, сообщения) — в своих сторах.
 *
 * ─── Текущие флаги ──────────────────────────────────────────────
 *   membersVisible     — правая панель участников
 *
 * ─── Зарезервировано для будущих фаз ────────────────────────────
 *   searchOpen         — оверлей поиска по каналу          (Phase 2)
 *   voicePanelOpen     — плашка активного голосового звонка (Phase 3)
 *   dmSectionVisible   — секция личных сообщений в сайдбаре  (Phase 2)
 *   sidebarCollapsed   — мобиль: сайдбар каналов свёрнут    (Mobile)
 */

import { create } from "zustand";

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface LayoutState {
    // ── Phase 1 (текущее) ─────────────────────────────────────────
    membersVisible: boolean;

    // ── Phase 2 (заглушки, подключить когда нужно) ────────────────
    searchOpen: boolean;
    dmSectionVisible: boolean;

    // ── Phase 3 (голос) ───────────────────────────────────────────
    voicePanelOpen: boolean;
    /** ID активного голосового канала, null если не в звонке */
    activeVoiceChannelId: string | null;

    // ── Mobile (отдельный клиент, но shared store если будет нужно) ─
    sidebarCollapsed: boolean;
}

interface LayoutActions {
    toggleMembers: () => void;
    setMembersVisible: (v: boolean) => void;

    toggleSearch: () => void;
    setSearchOpen: (v: boolean) => void;

    setVoiceChannel: (channelId: string | null) => void;
    closeVoicePanel: () => void;

    toggleSidebar: () => void;
    setSidebarCollapsed: (v: boolean) => void;

    toggleDmSection: () => void;
}

// ─── Стор ─────────────────────────────────────────────────────────────────────

export const useLayoutStore = create<LayoutState & LayoutActions>((set) => ({
    // Начальные значения
    membersVisible: true,
    searchOpen: false,
    dmSectionVisible: false,
    voicePanelOpen: false,
    activeVoiceChannelId: null,
    sidebarCollapsed: false,

    // ── Actions ──────────────────────────────────────────────────
    toggleMembers: () =>
        set((s) => ({ membersVisible: !s.membersVisible })),
    setMembersVisible: (v) =>
        set({ membersVisible: v }),

    toggleSearch: () =>
        set((s) => ({ searchOpen: !s.searchOpen })),
    setSearchOpen: (v) =>
        set({ searchOpen: v }),

    setVoiceChannel: (channelId) =>
        set({ activeVoiceChannelId: channelId, voicePanelOpen: channelId !== null }),
    closeVoicePanel: () =>
        set({ voicePanelOpen: false, activeVoiceChannelId: null }),

    toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebarCollapsed: (v) =>
        set({ sidebarCollapsed: v }),

    toggleDmSection: () =>
        set((s) => ({ dmSectionVisible: !s.dmSectionVisible })),
}));

// ─── Селекторы ────────────────────────────────────────────────────────────────
// Атомарные — каждый подписывается только на своё поле.

export const useMembersVisible    = () => useLayoutStore((s) => s.membersVisible);
export const useSearchOpen        = () => useLayoutStore((s) => s.searchOpen);
export const useVoicePanelOpen    = () => useLayoutStore((s) => s.voicePanelOpen);
export const useActiveVoiceChannel= () => useLayoutStore((s) => s.activeVoiceChannelId);
export const useSidebarCollapsed  = () => useLayoutStore((s) => s.sidebarCollapsed);
export const useDmSectionVisible  = () => useLayoutStore((s) => s.dmSectionVisible);