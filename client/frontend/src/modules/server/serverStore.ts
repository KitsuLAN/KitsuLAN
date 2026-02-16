/**
 * src/stores/serverStore.ts
 *
 * Хранит адрес выбранного сервера.
 * Persist — чтобы не выбирать снова после перезапуска.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

interface ServerState {
  address: string | null;
  setAddress: (addr: string) => void;
  clearAddress: () => void;
}

export const useServerStore = create<ServerState>()(
  persist(
    (set) => ({
      address: null,
      setAddress: (address) => set({ address }),
      clearAddress: () => set({ address: null }),
    }),
    { name: "kitsu-server" }
  )
);

// Селекторы
export const useServerAddress = () => useServerStore((s) => s.address);
export const useServerActions = () =>
  useServerStore(
    useShallow((s) => ({
      setAddress: s.setAddress,
      clearAddress: s.clearAddress,
    }))
  );
