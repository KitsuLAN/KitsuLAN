/**
 * src/pages/Chat.tsx
 * Реальный чат-интерфейс с отправкой сообщений.
 * В будущем: заменить MOCK_MESSAGES на gRPC-стрим.
 */
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUsername } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  author: string;
  initials: string;
  time: string;
  text: string;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: "m1",
    author: "Vyacheslav",
    initials: "VY",
    time: "19:01",
    text: "Всем привет! Сервер поднят 🦊",
  },
  {
    id: "m2",
    author: "KitsuFan",
    initials: "KF",
    time: "19:03",
    text: "Наконец-то свой Discord. Как там gRPC?",
  },
  {
    id: "m3",
    author: "Vyacheslav",
    initials: "VY",
    time: "19:04",
    text: "Register/Login работают через Protobuf. Следующий шаг — channels API.",
  },
  {
    id: "m4",
    author: "LanPartyGo",
    initials: "LP",
    time: "19:08",
    text: "Голосовые каналы когда? LiveKit смотрели?",
  },
  {
    id: "m5",
    author: "Vyacheslav",
    initials: "VY",
    time: "19:09",
    text: "Phase 3 на Roadmap. Сначала текст стабилизируем 👍",
  },
];

function ChatMessage({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-1 transition-colors hover:bg-kitsu-s1",
        isOwn && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isOwn
            ? "bg-primary/20 text-primary"
            : "bg-kitsu-s3 text-muted-foreground"
        )}
      >
        {msg.initials}
      </div>

      {/* Bubble */}
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
            {msg.author}
          </span>
          <span className="text-[11px] text-muted-foreground/50">
            {msg.time}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{msg.text}</p>
      </div>
    </div>
  );
}

export default function Chat() {
  const username = useUsername() ?? "User";
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(
      2,
      "0"
    )}`;
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        author: username,
        initials: username.slice(0, 2).toUpperCase(),
        time,
        text,
      },
    ]);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Список сообщений */}
      <ScrollArea className="flex-1">
        <div className="py-4">
          {/* Приветствие канала */}
          <div className="px-4 pb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kitsu-s2 text-3xl">
              #
            </div>
            <h2 className="mt-3 text-xl font-bold">
              Добро пожаловать в #general
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Это начало канала. Здесь начинается история KitsuLAN.
            </p>
          </div>

          {/* Разделитель с датой */}
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="h-px flex-1 bg-kitsu-s4" />
            <span className="text-[11px] font-semibold text-muted-foreground/50">
              Сегодня
            </span>
            <div className="h-px flex-1 bg-kitsu-s4" />
          </div>

          {messages.map((m) => (
            <ChatMessage key={m.id} msg={m} isOwn={m.author === username} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-4">
        <div className="flex items-center gap-2 rounded-lg border border-kitsu-s4 bg-kitsu-s2 px-3 py-2">
          {/* Attachment */}
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
                sendMessage();
              }
            }}
            placeholder="Сообщение в #general"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />

          {/* Emoji */}
          <button className="shrink-0 text-lg text-muted-foreground hover:text-foreground transition-colors">
            😊
          </button>

          {/* Send */}
          <button
            onClick={sendMessage}
            disabled={!draft.trim()}
            className={cn(
              "shrink-0 rounded px-2.5 py-1 text-sm font-bold transition-all",
              draft.trim()
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
