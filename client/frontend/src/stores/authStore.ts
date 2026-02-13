import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Login, Register } from "../../wailsjs/go/main/App";

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: string, pass: string) => Promise<void>;
  register: (user: string, pass: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAuthenticated: false,

      login: async (username, password) => {
        try {
          // Вызов Go функции
          const token = await Login(username, password);
          set({ token, username, isAuthenticated: true });
        } catch (err) {
          throw err; // Пробрасываем ошибку в UI
        }
      },

      register: async (username, password) => {
        // Вызов Go функции (она возвращает ID, но нам он тут не особо нужен)
        await Register(username, password);
      },

      logout: () =>
        set({ token: null, username: null, isAuthenticated: false }),
    }),
    {
      name: "kitsu-auth-storage", // Имя ключа в localStorage
    }
  )
);
