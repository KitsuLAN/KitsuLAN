// src/app/AppController.ts
import { WailsAPI } from "@/api/wails";
import { useAuthStore } from "@/modules/auth/authStore";
import { useServerStore } from "@/modules/server/serverStore";
import {AuthController} from "@/modules/auth/AuthController";

/**
 * AppController управляет состоянием всего процесса.
 * Это императивный слой над реактивными сторами.
 */
export const AppController = {
    async boot() {
        console.log("[System] Booting frontend process...");

        const { token } = useAuthStore.getState();
        const { address } = useServerStore.getState();

        try {
            // 1. Установка сетевого соединения (Go-side)
            if (address) {
                const ok = await WailsAPI.ConnectToServer(address);
                console.log(`[Network] Connection to ${address}: ${ok ? "OK" : "FAIL"}`);
            }

            // 2. Восстановление сессии
            if (token) {
                await WailsAPI.SetToken(token);
                console.log("[Auth] Session token restored");
            }
        } catch (e) {
            console.error("[System] Boot failure:", e);
        }
    },

    /**
     * Graceful Shutdown / Logout
     */
    async terminateSession() {
        await WailsAPI.UnsubscribeChannel();
        AuthController.logout();
        // Перезагрузка для полной очистки памяти (как завершение процесса)
        window.location.href = "/";
    }
};