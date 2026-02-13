/**
 * src/lib/wails.ts
 *
 * Shim для Wails API.
 * - В Wails-сборке делегирует к реальным go-функциям
 * - В браузере / dev без бэкенда — возвращает моки
 *
 * Почему так: Wails генерирует wailsjs/go/main/App.js только
 * когда запущен `wails dev`. В браузере этого модуля нет,
 * импорт упадёт. Этот shim изолирует зависимость.
 *
 * Использование:
 *   import { WailsAPI } from "@/lib/wails"
 *   const token = await WailsAPI.Login("user", "pass")
 */

// Wails инжектирует window.runtime при старте.
// Это надёжный способ проверить среду.
const IS_WAILS = typeof window !== "undefined" && "runtime" in window;

// ── Mock реализация (для браузера и разработки без бэкенда) ──
const Mock = {
  CheckServerStatus: async (): Promise<boolean> => {
    await delay(300);
    return true; // всегда онлайн в моке
  },

  ConnectToServer: async (_addr: string): Promise<boolean> => {
    await delay(400);
    return true;
  },

  Login: async (username: string, password: string): Promise<string> => {
    await delay(500);
    if (password.length < 1) throw new Error("Неверный логин или пароль");
    // Возвращаем фейковый JWT
    return `mock-token-${username}-${Date.now()}`;
  },

  Register: async (username: string, _password: string): Promise<string> => {
    await delay(500);
    if (username.length < 2) throw new Error("Никнейм слишком короткий");
    return `mock-user-id-${Date.now()}`;
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Реальная реализация (динамический импорт, чтобы не падал в браузере) ──
let WailsReal: typeof Mock | null = null;

async function loadWailsReal() {
  if (WailsReal) return WailsReal;
  try {
    const App = await import(/* @vite-ignore */ "../../wailsjs/go/main/App");
    WailsReal = {
      CheckServerStatus: App.CheckServerStatus,
      ConnectToServer: App.ConnectToServer ?? Mock.ConnectToServer,
      Login: App.Login,
      Register: App.Register,
    };
    return WailsReal;
  } catch {
    console.warn("[wails] Failed to load Wails API, falling back to mock");
    return Mock;
  }
}

// ── Публичный API ──
export const WailsAPI = {
  CheckServerStatus: async () => {
    const api = IS_WAILS ? await loadWailsReal() : Mock;
    return api.CheckServerStatus();
  },

  ConnectToServer: async (addr: string) => {
    const api = IS_WAILS ? await loadWailsReal() : Mock;
    return api.ConnectToServer(addr);
  },

  Login: async (username: string, password: string) => {
    const api = IS_WAILS ? await loadWailsReal() : Mock;
    return api.Login(username, password);
  },

  Register: async (username: string, password: string) => {
    const api = IS_WAILS ? await loadWailsReal() : Mock;
    return api.Register(username, password);
  },
};
