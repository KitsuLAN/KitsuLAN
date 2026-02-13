/**
 * src/stores/authStore.ts
 * Изменения: импорт через WailsAPI shim вместо прямого wailsjs
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { WailsAPI } from "@/lib/wails";

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const token = await WailsAPI.Login(username, password);
        set({ token, username, isAuthenticated: true });
      },

      register: async (username, password) => {
        await WailsAPI.Register(username, password);
        // Регистрация НЕ логинит автоматически — пользователь явно входит
      },

      logout: () =>
        set({ token: null, username: null, isAuthenticated: false }),
    }),
    {
      name: "kitsu-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          WailsAPI.SetToken(state.token);
        }
      },
    }
  )
);

export const useAuthToken = () => useAuthStore((s) => s.token);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useUsername = () => useAuthStore((s) => s.username);
export const useAuthActions = () =>
  useAuthStore(
    useShallow((s) => ({
      login: s.login,
      register: s.register,
      logout: s.logout,
    }))
  );
