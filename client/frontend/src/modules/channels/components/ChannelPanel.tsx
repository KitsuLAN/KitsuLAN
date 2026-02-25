import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScrollArea } from "@/uikit/scroll-area";
import { Avatar, AvatarFallback } from "@/uikit/avatar";
import { StatusDot } from "@/uikit/status-dot";
import { ListItem, ListGroupHeader } from "@/uikit/list-item";
import { useUsername } from "@/modules/auth/authStore";
import {
  useActiveGuildID,
  useActiveChannelID,
  useActiveChannels,
  useGuilds,
} from "@/modules/guilds/guildStore";
import { CHANNEL_TYPE_VOICE, CHANNEL_TYPE_TEXT } from "@/api/wails";
import { AuthController } from "@/modules/auth/AuthController";
import {Hash, Volume2, Mic, Settings, LogOut, Headphones, UserPlus, Plus, Signal, PhoneOff} from "lucide-react";
import { IconButton } from "@/uikit/icon-button";

// Импортируем модалки
import { CreateChannelModal } from "@/modules/channels/components/modals/CreateChannelModal";
import { InviteModal } from "@/modules/guilds/components/modals/InviteModal";
import {SettingsModal} from "@/modules/user/components/SettingsModal";
import {useActiveVoiceChannel, useLayoutStore} from "@/modules/layout/layoutStore";

export function ChannelPanel() {
  const username = useUsername();
  const guilds = useGuilds();
  const { guildId } = useParams();
  const navigate = useNavigate();
  const activeGuildID = useActiveGuildID();
  const activeChannelID = useActiveChannelID();
  const channels = useActiveChannels();
  const activeVoiceId = useActiveVoiceChannel();
  const { setVoiceChannel } = useLayoutStore();

  // Локальное состояние для модалок
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Можно запоминать, для какого типа канала открываем модалку (текст/голос),
  // но пока оставим просто открытие — тип выберется внутри

  const activeGuild = guilds.find((g) => g.id === activeGuildID);

  const textChannels = useMemo(
      () => channels.filter((c) => c.type !== CHANNEL_TYPE_VOICE),
      [channels]
  );
  const voiceChannels = useMemo(
      () => channels.filter((c) => c.type === CHANNEL_TYPE_VOICE),
      [channels]
  );

  return (
      <>
        <aside className="flex w-60 min-w-60 shrink-0 flex-col border-r border-kitsu-s4 bg-kitsu-s1">

          {/* Заголовок Гильдии */}
          <div className="group flex h-12 shrink-0 items-center justify-between border-b border-kitsu-s4 px-3 transition-colors hover:bg-kitsu-s2 cursor-pointer">
          <span className="truncate font-sans text-sm font-bold text-fg">
            {activeGuild?.name ?? "KitsuLAN Home"}
          </span>

            {/* Кнопка создания инвайта (появляется при ховере на шапку или всегда) */}
            {activeGuildID && (
                <div className="flex items-center">
                  <button
                      onClick={(e) => { e.stopPropagation(); setShowInvite(true); }}
                      className="flex h-6 w-6 items-center justify-center rounded-[3px] text-fg-dim hover:bg-kitsu-s3 hover:text-kitsu-orange transition-colors"
                      title="Пригласить людей"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
            )}
          </div>

          {/* Список каналов */}
          <ScrollArea className="flex-1">
            <div className="py-2">
              {/* ТЕКСТОВЫЕ */}
              <div className="group/header flex items-center justify-between pr-2">
                <ListGroupHeader>Текстовые каналы</ListGroupHeader>
                {activeGuildID && (
                    <button
                        onClick={() => setShowCreateChannel(true)}
                        className="opacity-0 group-hover/header:opacity-100 flex h-4 w-4 items-center justify-center rounded-[2px] text-fg-dim hover:bg-kitsu-s3 hover:text-fg transition-all"
                        title="Создать канал"
                    >
                      <Plus size={12} />
                    </button>
                )}
              </div>

              {textChannels.map((ch) => (
                  <ListItem
                      key={ch.id}
                      active={activeChannelID === ch.id}
                      prefix={<Hash size={14} />}
                      content={ch.name}
                      onClick={() => navigate(`/app/${guildId}/${ch.id}`)}
                  />
              ))}

              {/* ГОЛОСОВЫЕ */}
              <div className="group/header mt-2 flex items-center justify-between pr-2">
                <ListGroupHeader>Голосовые каналы</ListGroupHeader>
                {activeGuildID && (
                    <button
                        onClick={() => setShowCreateChannel(true)}
                        className="opacity-0 group-hover/header:opacity-100 flex h-4 w-4 items-center justify-center rounded-[2px] text-fg-dim hover:bg-kitsu-s3 hover:text-fg transition-all"
                        title="Создать канал"
                    >
                      <Plus size={12} />
                    </button>
                )}
              </div>

              {voiceChannels.map((ch) => (
                  <ListItem
                      key={ch.id}
                      active={activeVoiceId === ch.id}
                      prefix={<Volume2 size={14} />}
                      content={ch.name}
                      onClick={() => setVoiceChannel(ch.id!)}
                  />
              ))}

              {/* Пустое состояние */}
              {channels.length === 0 && activeGuildID && (
                  <div className="flex flex-col items-start gap-2 px-3 py-4">
                    <p className="font-mono text-xs text-fg-dim">Каналов нет</p>
                    <button
                        onClick={() => setShowCreateChannel(true)}
                        className="text-xs text-kitsu-orange hover:underline font-bold"
                    >
                      + Создать канал
                    </button>
                  </div>
              )}
            </div>
          </ScrollArea>

          {/* Voice Uplink Panel (показывается только если активен голос) */}
          {activeVoiceId && (
              <div className="flex shrink-0 items-center justify-between border-t border-kitsu-s4 bg-[#0d1611] px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-kitsu-online/20 text-kitsu-online">
                    <Signal size={12} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-kitsu-online">
                        Voice Uplink
                    </span>
                    <span className="truncate font-sans text-xs text-fg">
                        # {voiceChannels.find(c => c.id === activeVoiceId)?.name || "Unknown"}
                    </span>
                  </div>
                </div>

                <IconButton
                    size="sm"
                    title="Отключиться"
                    onClick={() => setVoiceChannel(null)}
                    className="text-kitsu-dnd hover:bg-kitsu-dnd/10 hover:border-kitsu-dnd hover:text-kitsu-dnd"
                >
                  <PhoneOff size={12} />
                </IconButton>
              </div>
          )}

          {/* User Bar */}
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-kitsu-s4 bg-kitsu-s2 px-2">
            <div className="relative flex shrink-0 cursor-pointer rounded-[3px] p-1 hover:bg-kitsu-s3">
              <Avatar size="sm">
                <AvatarFallback>{username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <StatusDot status="online" className="absolute bottom-1 right-1 size-1.5" />
            </div>

            <div className="min-w-0 flex-1 cursor-pointer">
              <div className="truncate text-xs font-bold text-fg">{username}</div>
              <div className="truncate font-mono text-[10px] text-fg-dim">Online</div>
            </div>

            <div className="flex shrink-0 gap-0.5">
              <IconButton size="sm" title="Микрофон"><Mic size={12} /></IconButton>
              <IconButton size="sm" title="Звук"><Headphones size={12} /></IconButton>
              <IconButton size="sm" onClick={() => setShowSettings(true)} title="Настройки"><Settings size={12} /></IconButton>
              <IconButton size="sm" onClick={AuthController.logout} title="Выйти" className="text-kitsu-dnd hover:bg-kitsu-dnd/10 hover:border-kitsu-dnd">
                <LogOut size={12} />
              </IconButton>
            </div>
          </div>
        </aside>

        {/* Рендерим модалки, если активны */}
        {showCreateChannel && activeGuildID && (
            <CreateChannelModal
                guildID={activeGuildID}
                onClose={() => setShowCreateChannel(false)}
            />
        )}

        {showInvite && activeGuildID && (
            <InviteModal
                guildID={activeGuildID}
                onClose={() => setShowInvite(false)}
            />
        )}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </>
  );
}