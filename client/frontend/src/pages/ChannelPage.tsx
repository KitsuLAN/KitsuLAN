import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/uikit/scroll-area";
import { useActiveChannelID, useActiveChannels } from "@/modules/guilds/guildStore";
import {
  useChatMessages,
  useChatHasMore,
} from "@/modules/chat/chatStore";
import { timestampPbToISO, type ChatMessage } from "@/api/wails";
import { cn } from "@/uikit/lib/utils";
import {ChatController} from "@/modules/chat/ChatController";
import {useUsername} from "@/modules/auth/authStore";
import {useChannelSubscription} from "@/modules/chat/hooks/useChannelSubscription";
import {useParams} from "react-router-dom";
import {GuildController} from "@/modules/guilds/GuildController";
import {GuildWelcome} from "@/modules/guilds/components/GuildWelcome";

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ChatPlaceHolder() {
  return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="mb-3 text-4xl">👈</div>
          <p className="text-sm">Выберите канал</p>
        </div>
      </div>
  )
}

// ── Компонент сообщения ──
function MessageItem({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const author = msg.author_username ?? "?";
  const initials = author.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-1 transition-colors hover:bg-kitsu-s1",
        isOwn && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isOwn
            ? "bg-primary/20 text-primary"
            : "bg-kitsu-s3 text-muted-foreground"
        )}
      >
        {initials}
      </div>
      <div className={cn("max-w-[70%]", isOwn && "items-end flex flex-col")}>
        <div
          className={cn(
            "mb-0.5 flex items-baseline gap-2",
            isOwn && "flex-row-reverse"
          )}
        >
          <span
            className={cn(
              "text-[13px] font-semibold",
              isOwn ? "text-primary" : "text-foreground"
            )}
          >
            {author}
          </span>
          <span className="text-[11px] text-muted-foreground/50">
            {formatTime(timestampPbToISO(msg.created_at))}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {msg.content}
        </p>
      </div>
    </div>
  );
}

// ── Главный компонент ──
export default function ChannelPage() {
  const { guildId, channelId } = useParams<{ guildId: string; channelId: string }>();

  // 2. Эффект синхронизации (URL -> Store)
  // Это гарантирует, что даже если мы откроем приложение по прямой ссылке,
  // контроллеры подгрузят нужные данные.
  useEffect(() => {
    if (guildId) {
      GuildController.selectGuild(guildId);
    }
    if (channelId) {
      GuildController.selectChannel(channelId);
    }
  }, [guildId, channelId]);

  // Если канала нет в URL, показываем заглушку или приветствие гильдии
  if (!channelId) {
    return <GuildWelcome guildId={guildId!} />;
  }

  const username = useUsername() ?? "";
  const channelID = useActiveChannelID();
  const channels = useActiveChannels();
  const activeChannel = channels.find((c) => c.id === channelID);

  const messages = useChatMessages(channelID);
  const hasMore = useChatHasMore(channelID);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Подписка на real-time события канала
  useChannelSubscription(channelID);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Placeholder пока канал не выбран
  if (!channelID) {
    return (
      <ChatPlaceHolder/>
    );
  }

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await ChatController.sendMessage(channelID, text);
      setDraft(""); // Очищаем только при успехе
    } catch (e) {
      // Сообщение об ошибке (можно добавить toast)
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || messages.length === 0) return;
    ChatController.loadHistory(channelID, messages[0].id);
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="py-4">
          {/* Кнопка загрузки истории */}
          {hasMore && (
            <div className="px-4 pb-2 text-center">
              <button
                onClick={handleLoadMore}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Загрузить предыдущие сообщения
              </button>
            </div>
          )}

          {/* Приветствие — только если нет истории */}
          {messages.length === 0 && (
            <div className="px-4 pb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kitsu-s2 text-3xl">
                #
              </div>
              <h2 className="mt-3 text-xl font-bold">
                Добро пожаловать в #{activeChannel?.name ?? "канал"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Это начало канала. Напишите первое сообщение!
              </p>
            </div>
          )}

          {/* Разделитель с датой */}
          {messages.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="h-px flex-1 bg-kitsu-s4" />
              <span className="text-[11px] font-semibold text-muted-foreground/50">
                Сегодня
              </span>
              <div className="h-px flex-1 bg-kitsu-s4" />
            </div>
          )}

          {messages.map((m) => (
            <MessageItem
              key={m.id}
              msg={m}
              isOwn={m.author_username === username}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-4">
        <div className="flex items-center gap-2 rounded-lg border border-kitsu-s4 bg-kitsu-s2 px-3 py-2">
          <button className="shrink-0 text-xl text-muted-foreground hover:text-foreground transition-colors">
            +
          </button>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Сообщение в #${activeChannel?.name ?? "канал"}`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            disabled={sending}
          />
          <button className="shrink-0 text-lg text-muted-foreground hover:text-foreground transition-colors">
            😊
          </button>
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className={cn(
              "shrink-0 rounded px-2.5 py-1 text-sm font-bold transition-all",
              draft.trim() && !sending
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-kitsu-s3 text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            ↑
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/30">
          Enter — отправить · Shift+Enter — новая строка
        </p>
      </div>
    </div>
  );
}
