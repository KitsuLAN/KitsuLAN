import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ScrollArea } from "@/uikit/scroll-area";
import { cn } from "@/uikit/lib/utils";
import { timestampPbToISO, type ChatMessage } from "@/api/wails";

import { GuildController } from "@/modules/guilds/GuildController";
import { ChatController } from "@/modules/chat/ChatController";
import { useChannelSubscription } from "@/modules/chat/hooks/useChannelSubscription";
import { useActiveChannels } from "@/modules/guilds/guildStore";
import { useChatMessages, useChatHasMore } from "@/modules/chat/chatStore";
import { useUsername } from "@/modules/auth/authStore";
import { GuildWelcome } from "@/modules/guilds/components/GuildWelcome";

// ─── Главный экран ─────────────────────────────────────────────────────────

export default function ChannelPage() {
  const { guildId, channelId } = useParams<{ guildId: string; channelId: string }>();
  const messages = useChatMessages(channelId ?? null);
  const hasMore = useChatHasMore(channelId ?? null);
  const username = useUsername() ?? "";

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (guildId) GuildController.selectGuild(guildId);
    if (channelId) GuildController.selectChannel(channelId);
  }, [guildId, channelId]);

  useChannelSubscription(channelId ?? null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!guildId) return null;
  if (!channelId) return <GuildWelcome guildId={guildId} />;

  return (
      <div className={S.layout}>
        <ScrollArea className={S.scrollArea}>
          <div className={S.messageListWrapper}>
            {hasMore && <LoadMoreButton onClick={() => ChatController.loadHistory(channelId, messages[0]?.id)} />}

            {messages.length === 0 && <EmptyState channelId={channelId} />}

            {messages.map((m) => (
                <MessageItem key={m.id} msg={m} isOwn={m.author_username === username} />
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <ChatInput channelId={channelId} />
      </div>
  );
}

// ─── Локальные под-компоненты ──────────────────────────────────────────────

function MessageItem({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  return (
      <div className={S.msg.container(isOwn)}>
        <div className={S.msg.avatar(isOwn)}>
          {msg.author_username?.slice(0, 2).toUpperCase()}
        </div>
        <div className={S.msg.contentBox(isOwn)}>
          <div className={S.msg.metaLine(isOwn)}>
            <span className={S.msg.author(isOwn)}>{msg.author_username}</span>
            <span className={S.msg.time}>{formatTime(timestampPbToISO(msg.created_at))}</span>
          </div>
          <p className={S.msg.text}>{msg.content}</p>
        </div>
      </div>
  );
}

function ChatInput({ channelId }: { channelId: string }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    try {
      await ChatController.sendMessage(channelId, draft);
      setDraft("");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className={S.input.wrapper}>
        <div className={S.input.container}>
          <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Напишите сообщение..."
              className={S.input.field}
              disabled={loading}
          />
          <button onClick={send} disabled={!draft.trim() || loading} className={S.input.sendBtn}>
            ↑
          </button>
        </div>
      </div>
  );
}

// Вспомогательные мини-вью
const LoadMoreButton = ({ onClick }: { onClick: () => void }) => (
    <div className="px-4 pb-2 text-center">
      <button onClick={onClick} className="text-xs text-muted-foreground hover:text-foreground">
        Загрузить предыдущие сообщения
      </button>
    </div>
);

const EmptyState = ({ channelId }: { channelId: string }) => {
  const channels = useActiveChannels();
  const name = channels.find(c => c.id === channelId)?.name;
  return (
      <div className="px-4 pb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kitsu-s2 text-3xl">#</div>
        <h2 className="mt-3 text-xl font-bold">Добро пожаловать в #{name}</h2>
      </div>
  );
};

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Styles Manifest (ОБЪЕКТ СТИЛЕЙ) ───────────────────────────────────────

const S = {
  layout: "flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-kitsu-bg",
  scrollArea: "flex-1 min-h-0",
  messageListWrapper: "flex flex-col py-4",

  msg: {
    container: (isOwn: boolean) =>
        cn(
            "group flex gap-3 px-4 py-1.5 transition-colors hover:bg-kitsu-s1",
            isOwn && "flex-row-reverse"
        ),

    avatar: (isOwn: boolean) =>
        cn(
            "mt-0.5 flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-xs font-bold",
            isOwn
                ? "bg-primary/20 text-primary"
                : "bg-kitsu-s3 text-muted-foreground"
        ),

    contentBox: (isOwn: boolean) =>
        cn(
            "flex max-w-[90%] min-w-0 flex-col",
            isOwn ? "items-end text-right" : "items-start"
        ),

    metaLine: (isOwn: boolean) =>
        cn(
            "mb-0.5 flex items-baseline gap-2",
            isOwn && "flex-row-reverse"
        ),

    author: (isOwn: boolean) =>
        cn(
            "max-w-full truncate text-[13px] font-semibold",
            isOwn ? "text-primary" : "text-foreground"
        ),

    time: "shrink-0 text-[10px] opacity-40 tabular-nums",

    text: "w-full whitespace-pre-wrap break-all text-[14px] leading-relaxed text-foreground/90",
  },

  input: {
    wrapper: "shrink-0 p-4",
    container: "flex items-center gap-2 rounded-lg border border-kitsu-s4 bg-kitsu-s2 px-3 py-2.5",
    field: "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50",
    sendBtn: "shrink-0 rounded-md bg-primary p-1.5 text-white disabled:opacity-20",
  },
};