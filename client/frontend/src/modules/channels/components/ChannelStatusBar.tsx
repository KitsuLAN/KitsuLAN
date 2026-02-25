import { useActiveChannels } from "@/modules/guilds/guildStore";
import { useActiveMembers } from "@/modules/guilds/guildStore";
import { Activity, ShieldCheck, Cpu } from "lucide-react";

export function ChannelStatusBar({ channelId }: { channelId: string }) {
    const channels = useActiveChannels();
    const channel = channels.find(c => c.id === channelId);
    const members = useActiveMembers();
    const onlineCount = members.filter(m => m.is_online).length;

    if (!channel) return null;

    return (
        <div className="flex h-[22px] shrink-0 items-center justify-between border-b border-kitsu-s4 bg-kitsu-s1 px-4">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-fg-dim">
                    <span>UPLINK</span>
                    <span className="text-fg-muted">#{channel.name?.toUpperCase()}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[9px] text-fg-dim">
                    <span>USERS ONLINE</span>
                    <span className="text-kitsu-online">{onlineCount}</span>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] text-fg-dim">
                    <Activity size={10} />
                    <span>LATENCY</span>
                    {/* TODO: Показывать тут настоящую задержку */}
                    <span className="text-kitsu-online">12ms</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 font-mono text-[9px] text-fg-dim">
                    <ShieldCheck size={10} className="text-kitsu-orange" />
                    <span>Ed25519 SECURE</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[9px] text-fg-dim">
                    <Cpu size={10} />
                    <span>vDevRolling</span>
                </div>
            </div>
        </div>
    );
}