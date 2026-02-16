import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { ChatMessage } from "@/api/wails";

interface ChatState {
  messagesByChannel: Record<string, ChatMessage[]>;
  hasMoreByChannel: Record<string, boolean>;

  // Только мутаторы (setter-ы)
  appendMessage: (msg: ChatMessage) => void;
  removeMessage: (channelID: string, messageID: string) => void;
  setHistory: (channelID: string, messages: ChatMessage[], hasMore: boolean, prepend: boolean) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messagesByChannel: {},
  hasMoreByChannel: {},

  appendMessage: (msg) => set((s) => {
    const cid = msg.channel_id!;
    const existing = s.messagesByChannel[cid] ?? [];
    if (existing.some((m) => m.id === msg.id)) return s;
    return {
      messagesByChannel: { ...s.messagesByChannel, [cid]: [...existing, msg] },
    };
  }),

  removeMessage: (cid, mid) => set((s) => ({
    messagesByChannel: {
      ...s.messagesByChannel,
      [cid]: (s.messagesByChannel[cid] ?? []).filter((m) => m.id !== mid),
    },
  })),

  setHistory: (cid, messages, hasMore, prepend) => set((s) => {
    const existing = s.messagesByChannel[cid] ?? [];
    return {
      messagesByChannel: {
        ...s.messagesByChannel,
        [cid]: prepend ? [...messages, ...existing] : messages,
      },
      hasMoreByChannel: { ...s.hasMoreByChannel, [cid]: hasMore },
    };
  }),
}));

// Селекторы для UI
export const useChatMessages = (cid: string | null) =>
    useChatStore(useShallow(s => (cid ? s.messagesByChannel[cid] ?? [] : [])));

export const useChatHasMore = (cid: string | null) =>
    useChatStore(s => (cid ? s.hasMoreByChannel[cid] ?? false : false));