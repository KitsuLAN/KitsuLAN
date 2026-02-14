/**
 * src/stores/chatStore.ts
 *
 * Сообщения канала + real-time подписка через Wails Events.
 *
 * Жизненный цикл подписки управляется хуком useChannelSubscription —
 * он вызывается в компоненте Chat и привязан к его mount/unmount.
 */
import { create } from "zustand";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { WailsAPI } from "@/lib/wails";
import type { ChatMessage, MessageDeleted } from "@/lib/wails";

type StrictChatMessage = ChatMessage & {
  id: string;
  channel_id: string;
};

type StrictMessageDeleted = MessageDeleted & {
  channel_id: string;
  message_id: string;
};

function normalizeChatMessage(msg: ChatMessage): StrictChatMessage | null {
  if (!msg.id || !msg.channel_id) return null;
  return msg as StrictChatMessage;
}

function normalizeMessageDeleted(
  d: MessageDeleted
): StrictMessageDeleted | null {
  if (!d.channel_id || !d.message_id) return null;
  return d as StrictMessageDeleted;
}

// EventsOn/EventsOff доступны только в Wails-окружении.
// Импортируем динамически чтобы не падать в браузере.
async function getWailsRuntime() {
  try {
    return await import(/* @vite-ignore */ "../../wailsjs/runtime/runtime");
  } catch {
    return null;
  }
}

interface ChatState {
  // Сообщения хранятся по channelID
  messagesByChannel: Record<string, ChatMessage[]>;
  hasMoreByChannel: Record<string, boolean>;
  loading: boolean;
  error: string | null;

  loadHistory: (channelID: string, before?: string) => Promise<void>;
  sendMessage: (channelID: string, content: string) => Promise<void>;
  appendMessage: (msg: ChatMessage) => void;
  removeMessage: (channelID: string, messageID: string) => void;
  clearChannel: (channelID: string) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messagesByChannel: {},
  hasMoreByChannel: {},
  loading: false,
  error: null,

  loadHistory: async (channelID, before = "") => {
    set({ loading: true, error: null });
    try {
      const messages = await WailsAPI.GetHistory(channelID, 50, before);
      const safeMessages = messages ?? [];

      set((s) => {
        const existing = s.messagesByChannel[channelID] ?? [];
        // Подгрузка старых: prepend; первая загрузка: replace
        const merged = before ? [...safeMessages, ...existing] : safeMessages;

        return {
          messagesByChannel: { ...s.messagesByChannel, [channelID]: merged },
          // has_more определяется по количеству — если вернулось меньше 50, больше нет
          hasMoreByChannel: {
            ...s.hasMoreByChannel,
            [channelID]: safeMessages.length === 50,
          },
          loading: false,
        };
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  sendMessage: async (channelID, content) => {
    // Оптимистичного добавления нет — сервер пришлёт через стрим.
    // Если стрим не активен (не подписаны) — добавляем вручную.
    try {
      const msg = await WailsAPI.SendMessage(channelID, content);
      // Если в канале нет активной подписки (IS_WAILS=false или mock),
      // добавляем сообщение напрямую.
      const hasSubscription = !!get().messagesByChannel[channelID];
      if (!hasSubscription) {
        get().appendMessage(msg);
      }
    } catch (e) {
      set({ error: String(e) });
      throw e; // пробрасываем чтобы UI мог показать ошибку
    }
  },

  appendMessage: (msg) =>
    set((s) => {
      const { channel_id: channelID, id } = msg;
      if (!channelID || !id) return s;

      const existing = s.messagesByChannel[channelID] ?? [];
      if (existing.some((m) => m.id === id)) return s;

      return {
        messagesByChannel: {
          ...s.messagesByChannel,
          [channelID]: [...existing, msg],
        },
      };
    }),

  removeMessage: (channelID, messageID) =>
    set((s) => ({
      messagesByChannel: {
        ...s.messagesByChannel,
        [channelID]: (s.messagesByChannel[channelID] ?? []).filter(
          (m) => m.id !== messageID
        ),
      },
    })),

  clearChannel: (channelID) =>
    set((s) => {
      const { [channelID]: _, ...rest } = s.messagesByChannel;
      return { messagesByChannel: rest };
    }),
}));

// Селекторы
export const useChatMessages = (channelID: string | null) =>
  useChatStore(
    useShallow((s) => (channelID ? s.messagesByChannel[channelID] ?? [] : []))
  );

export const useChatHasMore = (channelID: string | null) =>
  useChatStore(
    useShallow((s) =>
      channelID ? s.hasMoreByChannel[channelID] ?? false : false
    )
  );

export const useChatActions = () =>
  useChatStore(
    useShallow((s) => ({
      loadHistory: s.loadHistory,
      sendMessage: s.sendMessage,
      clearChannel: s.clearChannel,
    }))
  );

// ── Хук подписки ─────────────────────────────────────────────────────────────

/**
 * useChannelSubscription — управляет жизненным циклом gRPC-стрима.
 *
 * Использование в компоненте Chat:
 *   useChannelSubscription(activeChannelID)
 *
 * При смене channelID:
 *  1. Отписывается от предыдущего
 *  2. Загружает историю нового
 *  3. Подписывается на Wails-события нового
 */
export function useChannelSubscription(channelID: string | null) {
  const { loadHistory, appendMessage, removeMessage } = useChatStore(
    useShallow((s) => ({
      loadHistory: s.loadHistory,
      appendMessage: s.appendMessage,
      removeMessage: s.removeMessage,
    }))
  );

  const genRef = useRef(0);

  useEffect(() => {
    if (!channelID) return;
    const chID = channelID;
    const gen = ++genRef.current;

    let runtime: any | null = null;

    (async () => {
      await loadHistory(chID);
      if (genRef.current !== gen) return;

      await WailsAPI.SubscribeChannel(chID);
      if (genRef.current !== gen) {
        WailsAPI.UnsubscribeChannel();
        return;
      }

      runtime = await getWailsRuntime();
      if (!runtime || genRef.current !== gen) return;

      runtime.EventsOn("chat:message", (msg: ChatMessage) => {
        const safe = normalizeChatMessage(msg);
        if (!safe) return;
        if (safe.channel_id === chID) appendMessage(safe);
      });

      runtime.EventsOn("chat:message_deleted", (data: MessageDeleted) => {
        const safe = normalizeMessageDeleted(data);
        if (!safe) return;
        if (safe.channel_id === chID)
          removeMessage(safe.channel_id, safe.message_id);
      });
    })();

    return () => {
      if (genRef.current === gen) {
        runtime?.EventsOff("chat:message");
        runtime?.EventsOff("chat:message_deleted");
        WailsAPI.UnsubscribeChannel();
      }
    };
  }, [channelID]);
}
