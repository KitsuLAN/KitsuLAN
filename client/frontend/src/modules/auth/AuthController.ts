import { WailsAPI } from "@/api/wails";
import { useAuthStore } from "./authStore";
import {GuildController} from "@/modules/guilds/GuildController";

export const AuthController = {
    async login(u: string, p: string) {
        const token = await WailsAPI.Login(u, p);
        useAuthStore.getState().setAuth(token, u)
        // После логина Go-часть уже знает токен (см. app.go),
        // но для надежности можно вызвать WailsAPI.SetToken(token)
    },

    async register(u: string, p: string) {
        await WailsAPI.Register(u, p);
    },

    logout() {
        useAuthStore.getState().clearAuth()
        WailsAPI.UnsubscribeChannel();
        GuildController.clearSelection();
    }
};