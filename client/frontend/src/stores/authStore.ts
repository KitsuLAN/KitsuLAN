import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { Login, Register } from "../../wailsjs/go/main/App";

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
        const token = await Login(username, password);
        set({ token, username, isAuthenticated: true });
      },

      register: async (username, password) => {
        await Register(username, password);
      },

      logout: () =>
        set({ token: null, username: null, isAuthenticated: false }),
    }),
    { name: "kitsu-auth-storage" }
  )
);

// Селекторы для производительности
export const useAuthToken = () => useAuthStore((state) => state.token);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useUsername = () => useAuthStore((state) => state.username);
export const useAuthActions = () =>
  useAuthStore(
    useShallow((state) => ({
      login: state.login,
      register: state.register,
      logout: state.logout,
    }))
  );
