/**
 * src/lib/wails.ts
 *
 * Shim для Wails API — все Go-методы из app.go в одном месте.
 * В Wails-сборке делегирует к реальным функциям.
 * В браузере / dev без бэкенда — возвращает моки.
 */
import type { kitsulanv1, timestamppb } from "../../wailsjs/go/models";

export type Guild = kitsulanv1.Guild;
export type Channel = kitsulanv1.Channel;
export type Member = kitsulanv1.Member;
export type ChatMessage = kitsulanv1.ChatMessage;
export type MessageDeleted = { message_id?: string; channel_id?: string };

export const CHANNEL_TYPE_TEXT = 1;
export const CHANNEL_TYPE_VOICE = 2;

const IS_WAILS = typeof window !== "undefined" && "runtime" in window;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Mock ──────────────────────────────────────────────────────────────────────
const dateToTimestampPB = (): timestamppb.Timestamp => ({
  seconds: Math.floor(Date.now() / 1000),
  nanos: 0,
});

export function timestampPbToISO(
  ts?: timestamppb.Timestamp
): string | undefined {
  if (!ts || typeof ts.seconds !== "number") return undefined;

  const ms = ts.seconds * 1000 + Math.floor((ts.nanos ?? 0) / 1_000_000);
  return new Date(ms).toISOString();
}

const MOCK_GUILD: Guild = {
  id: "mock-guild-1",
  name: "Mock Guild",
  description: "Тестовая гильдия",
  icon_url: "",
  owner_id: "mock-user-1",
  member_count: 2,
  created_at: dateToTimestampPB(),
  convertValues: function (a: any, classs: any, asMap?: boolean) {
    throw new Error("Function not implemented.");
  },
};

const MOCK_CHANNEL: Channel = {
  id: "mock-channel-1",
  guild_id: "mock-guild-1",
  name: "general",
  type: CHANNEL_TYPE_TEXT,
  position: 0,
};

const Mock = {
  PingServer: async (addr: string) => {
    await delay(500);
    // Для мока: считаем онлайн только localhost
    return addr.includes("localhost");
  },

  // Auth
  CheckServerStatus: async () => {
    await delay(100);
    return true;
  },
  ConnectToServer: async (_addr: string) => {
    await delay(300);
    return true;
  },
  SetToken: async (_token: string) => {},
  Login: async (username: string, password: string) => {
    await delay(500);
    if (!password) throw new Error("Неверный логин или пароль");
    return `mock-token-${username}-${Date.now()}`;
  },
  Register: async (username: string, _password: string) => {
    await delay(500);
    if (username.length < 2) throw new Error("Никнейм слишком короткий");
    return `mock-user-id-${Date.now()}`;
  },

  // Guild
  CreateGuild: async (_name: string, _desc: string): Promise<Guild> => {
    await delay(400);
    return {
      ...MOCK_GUILD,
      id: `guild-${Date.now()}`,
      convertValues: function (a: any, classs: any, asMap?: boolean) {
        throw new Error("Function not implemented.");
      },
    };
  },
  ListMyGuilds: async (): Promise<Guild[]> => {
    await delay(300);
    return [MOCK_GUILD];
  },
  CreateInvite: async (
    _guildID: string,
    _maxUses: number,
    _expiresInHours: number
  ) => {
    await delay(300);
    return "MOCKCODE";
  },
  JoinByInvite: async (_code: string): Promise<Guild> => {
    await delay(400);
    return MOCK_GUILD;
  },
  LeaveGuild: async (_guildID: string) => {
    await delay(200);
  },
  DeleteGuild: async (_guildID: string) => {
    await delay(200);
  },
  ListChannels: async (_guildID: string): Promise<Channel[]> => {
    await delay(200);
    return [MOCK_CHANNEL];
  },
  CreateChannel: async (
    _guildID: string,
    name: string,
    type: number
  ): Promise<Channel> => {
    await delay(300);
    return {
      ...MOCK_CHANNEL,
      id: `ch-${Date.now()}`,
      name,
      type: type as Channel["type"],
    };
  },
  ListMembers: async (_guildID: string): Promise<Member[]> => {
    await delay(200);
    return [
      {
        user_id: "mock-user-1",
        username: "MockUser",
        avatar_url: "",
        nickname: "",
        is_online: true,
        joined_at: dateToTimestampPB(),
        convertValues: function (a: any, classs: any, asMap?: boolean) {
          throw new Error("Function not implemented.");
        },
      },
    ];
  },

  // Chat
  SendMessage: async (
    _channelID: string,
    content: string
  ): Promise<ChatMessage> => {
    await delay(200);
    return {
      id: `msg-${Date.now()}`,
      channel_id: "mock-channel-1",
      author_id: "mock-user-1",
      author_username: "MockUser",
      author_avatar_url: "",
      content,
      created_at: dateToTimestampPB(),
      convertValues: function (a: any, classs: any, asMap?: boolean) {
        throw new Error("Function not implemented.");
      },
    };
  },
  GetHistory: async (
    _channelID: string,
    _limit: number,
    _before: string
  ): Promise<ChatMessage[]> => {
    await delay(300);
    return [];
  },
  SubscribeChannel: async (_channelID: string) => {},
  UnsubscribeChannel: async () => {},
};

// ── Real (динамический импорт) ────────────────────────────────────────────────

type WailsApp = typeof Mock;

let WailsReal: WailsApp | null = null;

async function loadReal(): Promise<WailsApp> {
  if (WailsReal) return WailsReal;
  try {
    const App = await import(/* @vite-ignore */ "../../wailsjs/go/main/App");
    // Собираем объект в локальную переменную — убирает ошибку с null
    const real: WailsApp = {
      PingServer: App.PingServer,
      CheckServerStatus: App.CheckServerStatus,
      ConnectToServer: App.ConnectToServer,
      SetToken: App.SetToken,
      Login: App.Login,
      Register: App.Register,
      CreateGuild: App.CreateGuild,
      ListMyGuilds: App.ListMyGuilds,
      CreateInvite: App.CreateInvite,
      JoinByInvite: App.JoinByInvite,
      LeaveGuild: App.LeaveGuild,
      DeleteGuild: App.DeleteGuild,
      ListChannels: App.ListChannels,
      CreateChannel: App.CreateChannel,
      ListMembers: App.ListMembers,
      SendMessage: App.SendMessage,
      GetHistory: App.GetHistory,
      SubscribeChannel: App.SubscribeChannel,
      UnsubscribeChannel: App.UnsubscribeChannel,
    };
    WailsReal = real;
    return real;
  } catch {
    console.warn("[wails] Failed to load Wails API, falling back to mock");
    return Mock;
  }
}

function api(): Promise<WailsApp> {
  return IS_WAILS ? loadReal() : Promise.resolve(Mock);
}

// ── Публичный API ─────────────────────────────────────────────────────────────

export const WailsAPI = {
  PingServer: (addr: string) => api().then(a => (a as any).PingServer(addr)),
  // Auth
  CheckServerStatus: () => api().then((a) => a.CheckServerStatus()),
  ConnectToServer: (addr: string) => api().then((a) => a.ConnectToServer(addr)),
  SetToken: (token: string) => api().then((a) => a.SetToken(token)),
  Login: (u: string, p: string) => api().then((a) => a.Login(u, p)),
  Register: (u: string, p: string) => api().then((a) => a.Register(u, p)),

  // Guild
  CreateGuild: (name: string, desc: string) =>
    api().then((a) => a.CreateGuild(name, desc)),
  ListMyGuilds: () => api().then((a) => a.ListMyGuilds()),
  CreateInvite: (guildID: string, maxUses: number, expiresInHours: number) =>
    api().then((a) => a.CreateInvite(guildID, maxUses, expiresInHours)),
  JoinByInvite: (code: string) => api().then((a) => a.JoinByInvite(code)),
  LeaveGuild: (guildID: string) => api().then((a) => a.LeaveGuild(guildID)),
  DeleteGuild: (guildID: string) => api().then((a) => a.DeleteGuild(guildID)),
  ListChannels: (guildID: string) => api().then((a) => a.ListChannels(guildID)),
  CreateChannel: (guildID: string, name: string, type: number) =>
    api().then((a) => a.CreateChannel(guildID, name, type)),
  ListMembers: (guildID: string) => api().then((a) => a.ListMembers(guildID)),

  // Chat
  SendMessage: (channelID: string, content: string) =>
    api().then((a) => a.SendMessage(channelID, content)),
  GetHistory: (channelID: string, limit: number, before: string) =>
    api().then((a) => a.GetHistory(channelID, limit, before)),
  SubscribeChannel: (channelID: string) =>
    api().then((a) => a.SubscribeChannel(channelID)),
  UnsubscribeChannel: () => api().then((a) => a.UnsubscribeChannel()),
};
