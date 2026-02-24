import { WailsAPI } from "@/api/wails";
import { useServerStore } from "./serverStore";
import {useAuthStore} from "@/modules/auth/authStore";
import {useGuildStore} from "@/modules/guilds/guildStore";
import {useChatStore} from "@/modules/chat/chatStore";

export const KNOWN_SERVERS = [
    { id: "1", label: "Локальный", addr: "localhost:8090", icon: "🦊" },
    { id: "2", label: "LAN Party", addr: "192.168.1.10:8090", icon: "🎮" },
    { id: "3", label: "RPi Node", addr: "10.0.0.5:8090", icon: "🍓" },
];

export const ServerController = {
    /**
     * Запуск Health Check для всех известных узлов
     */
    async discoverServers() {
        // 1. Инициализируем статус "checking"
        const initialPings: Record<string, any> = {};
        KNOWN_SERVERS.forEach(s => initialPings[s.id] = "checking");
        useServerStore.setState({ pings: initialPings });

        // 2. Опрашиваем каждый сервер персонально
        // Используем Promise.all для параллельного выполнения
        await Promise.all(KNOWN_SERVERS.map(async (server) => {
            try {
                // Теперь мы передаем адрес сервера в функцию проверки
                const isOnline = await WailsAPI.PingServer(server.addr);

                this._updatePing(server.id, isOnline ? "online" : "offline");
            } catch {
                this._updatePing(server.id, "offline");
            }
        }));
    },

    async connect(newAddress: string) {
        const currentAddress = useServerStore.getState().address;

        // 1. Если адрес изменился — делаем Full Reset всех доменных сторов
        if (currentAddress && currentAddress !== newAddress) {
            console.log(`[Server] Switching from ${currentAddress} to ${newAddress}. Purging session...`);

            // Сбрасываем авторизацию
            useAuthStore.setState({
                token: null,
                username: null,
                isAuthenticated: false
            });

            // Сбрасываем кэш гильдий и каналов
            useGuildStore.setState({
                guilds: [],
                activeGuildID: null,
                activeChannelID: null,
                channelsByGuild: {},
                membersByGuild: {}
            });

            // Сбрасываем сообщения чата
            useChatStore.setState({
                messagesByChannel: {},
                hasMoreByChannel: {}
            });
        }

        // 2. Вызываем системный метод подключения в Go
        const connected = await WailsAPI.ConnectToServer(newAddress);
        if (!connected) return "error";

        useServerStore.setState({address: newAddress})

        try {
            const status = await WailsAPI.GetRealmStatus();
            useServerStore.setState({ isInitialized: status.is_initialized });
            return status.is_initialized ? "auth" : "setup";
        } catch (e) {
            console.error("[Server] Failed to get realm status:", e);
            return "error";
        }
    },

    _updatePing(id: string, status: "online" | "offline") {
        useServerStore.setState(s => ({
            pings: { ...s.pings, [id]: status }
        }));
    }
};