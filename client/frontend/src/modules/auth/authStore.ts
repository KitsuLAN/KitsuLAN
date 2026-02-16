import { create } from "zustand";
import { persist } from "zustand/middleware";


export interface AuthState {
    token: string | null;
    username: string | null;
    isAuthenticated: boolean;

    setAuth: (token: string, username: string) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            username: null,
            isAuthenticated: false,

            setAuth: (token, username) =>
                set({
                    token,
                    username,
                    isAuthenticated: true,
                }),

            clearAuth: () =>
                set({
                    token: null,
                    username: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: "kitsu-auth",
        }
    )
);

export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useUsername = () => useAuthStore((s) => s.username);