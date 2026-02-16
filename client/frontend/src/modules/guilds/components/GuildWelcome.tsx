// src/modules/guilds/components/GuildWelcome.tsx
import { useGuilds } from "@/modules/guilds/guildStore";
import { Button } from "@/uikit/button";
import { GuildController } from "@/modules/guilds/GuildController";

export function GuildWelcome({ guildId }: { guildId: string }) {
    const guilds = useGuilds();
    const guild = guilds.find((g) => g.id === guildId);

    if (!guild) return null;

    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl text-3xl font-bold shadow-xl"
                style={{ backgroundColor: guild.color || "#525252" }}
            >
                {guild.name?.slice(0, 2).toUpperCase()}
            </div>

            <h1 className="mb-2 text-3xl font-bold">{guild.name}</h1>
            <p className="mb-8 max-w-md text-muted-foreground">
                <p>
                    {"Добро пожаловать в гильдию. Выберите канал слева, чтобы начать общение."}
                </p>
                <p>
                    {guild.description}
                </p>
            </p>

            <div className="flex gap-4">
                {/* Можно добавить быстрые действия */}
                <Button variant="outline" onClick={() => GuildController.createInvite(guildId, 0, 0)}>
                    👤 Пригласить друзей
                </Button>
            </div>
        </div>
    );
}