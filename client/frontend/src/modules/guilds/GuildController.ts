import { WailsAPI } from "@/api/wails";
import { useGuildStore } from "./guildStore";
import { ChatController } from "@/modules/chat/ChatController";

export const GuildController = {
    async loadUserGuilds() {
        useGuildStore.setState({ loading: true });

        try {
            const guilds = await WailsAPI.ListMyGuilds();
            const safeGuilds = guilds ?? [];

            useGuildStore.setState({
                guilds: safeGuilds,
                loading: false
            });

            // Логика автовыбора первой гильдии (Go-style: проверка состояния перед действием)
            const currentActive = useGuildStore.getState().activeGuildID;
            if (safeGuilds.length > 0 && !currentActive) {
                // Вызываем логику выбора гильдии (которая подгрузит каналы и участников)
                await this.selectGuild(safeGuilds[0].id!);
            }
        } catch (e) {
            useGuildStore.setState({ loading: false });
            console.error("[GuildController] loadUserGuilds failed:", e);
        }
    },


    async selectGuild(guildID: string, autoSelectChannel = false) {
        const state = useGuildStore.getState();
        if (state.activeGuildID === guildID) return;

        useGuildStore.setState({ activeGuildID: guildID });

        const [channels, members] = await Promise.all([
            WailsAPI.ListChannels(guildID),
            WailsAPI.ListMembers(guildID)
        ]);

        useGuildStore.setState(s => ({
            channelsByGuild: { ...s.channelsByGuild, [guildID]: channels ?? [] },
            membersByGuild: { ...s.membersByGuild, [guildID]: members ?? [] }
        }));

        // Автовыбор срабатывает только если мы явно попросили (например, при клике в сайдбаре)
        if (autoSelectChannel) {
            const firstText = channels.find(c => c.type === 1);
            if (firstText?.id) {
                // Здесь можно сделать navigate через контроллер или вернуть ID
                return firstText.id;
            }
        }
    },

    async selectChannel(channelID: string) {
        const state = useGuildStore.getState();
        if (state.activeChannelID === channelID) return;

        // TODO: Сделать тут проверки на тип канала, если канал голосовой не менять URL
        useGuildStore.setState({ activeChannelID: channelID });
        // При смене канала просим чат-контроллер обновить историю
        await ChatController.loadHistory(channelID);
    },

    async createChannel(guildID: string, name: string, type: number) {
        // 1. Вызов процедуры на бэкенде
        const channel = await WailsAPI.CreateChannel(guildID, name, type);

        // 2. Атомарное обновление локальной БД (стора)
        useGuildStore.setState((s) => ({
            channelsByGuild: {
                ...s.channelsByGuild,
                [guildID]: [...(s.channelsByGuild[guildID] ?? []), channel],
            },
        }));

        return channel;
    },

    clearSelection() {
        useGuildStore.setState({
            activeGuildID: null,
            activeChannelID: null
        });
        // Можно также очистить сообщения в чате, чтобы не висели в памяти
        // useChatStore.getState().clearAll();
    },

    async createGuild(name: string, description: string) {
        const guild = await WailsAPI.CreateGuild(name, description);

        useGuildStore.setState((s) => ({
            guilds: [...s.guilds, guild],
        }));

        return guild;
    },

    async joinByInvite(code: string) {
        const guild = await WailsAPI.JoinByInvite(code);

        useGuildStore.setState((s) => {
            // Проверка на дубликаты (как в хорошем сетевом коде)
            if (s.guilds.some((g) => g.id === guild.id)) return s;
            return { guilds: [...s.guilds, guild] };
        });

        return guild;
    },

    async createInvite(guildID: string, maxUses: number, expiresInHours: number) {
        // Здесь стор обновлять не нужно, просто возвращаем код из API
        return await WailsAPI.CreateInvite(guildID, maxUses, expiresInHours);
    }
};