import { create } from "zustand";
import { persist } from "zustand/middleware";

type PingStatus = "checking" | "online" | "offline";

interface ServerState {
    address: string | null;
    // Результаты пингов храним в памяти, они не должны выживать после перезапуска
    pings: Record<string, PingStatus>;
}

export const useServerStore = create<ServerState>()(
    persist(
        (set) => ({
            address: null,
            pings: {},
        }),
        {
            name: "kitsu-server",
            // Сохраняем только адрес, pings игнорируем
            partialize: (state) => ({ address: state.address }),
        }
    )
);

// Селекторы
export const useServerAddress = () => useServerStore((s) => s.address);
export const useServerPings = () => useServerStore((s) => s.pings);