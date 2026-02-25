import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { cn } from "@/uikit/lib/utils";
import { ServerController, KNOWN_SERVERS } from "@/modules/server/ServerController";
import { useServerAddress, useServerPings } from "@/modules/server/serverStore";
import { toast } from "sonner";
import { StatusDot } from "@/uikit/status-dot";
import { Radio, Wifi } from "lucide-react";

export default function ServerSelect() {
    const navigate = useNavigate();
    const savedAddress = useServerAddress();
    const pings = useServerPings();

    const [selectedID, setSelectedID] = useState<string | null>(null);
    const [customAddr, setCustomAddr] = useState("");
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        ServerController.discoverServers();
        if (savedAddress) {
            const known = KNOWN_SERVERS.find((s) => s.addr === savedAddress);
            if (known) setSelectedID(known.id);
            else setCustomAddr(savedAddress);
        }
    }, [savedAddress]);

    const activeAddr = selectedID
        ? KNOWN_SERVERS.find((s) => s.id === selectedID)?.addr ?? ""
        : customAddr.trim();

    const handleConnect = async () => {
        if (!activeAddr) return;
        setConnecting(true);
        try {
            const route = await ServerController.connect(activeAddr);
            if (route === "auth") navigate("/auth");
            else if (route === "setup") navigate("/setup");
            else toast.error("CONNECTION FAILED :: HOST UNREACHABLE");
        } finally {
            setConnecting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-kitsu-bg p-6 text-fg">
            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                    backgroundSize: "40px 40px"
                }}
            />

            <div className="relative z-10 w-full max-w-[420px]">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[3px] bg-kitsu-s1 border border-kitsu-s4 text-4xl">
                        📡
                    </div>
                    <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-fg">
                        Network Scanner
                    </h1>
                    <p className="font-mono text-xs text-fg-dim">Select a frequency to connect</p>
                </div>

                {/* Known Servers List */}
                <div className="mb-6 space-y-1">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">Detected Signals</span>
                        <span className="animate-pulse font-mono text-[10px] text-kitsu-orange">SCANNING...</span>
                    </div>

                    {KNOWN_SERVERS.map((s) => {
                        const isSelected = selectedID === s.id;
                        const ping = pings[s.id];
                        const isOnline = ping === "online";

                        return (
                            <button
                                key={s.id}
                                onClick={() => { setSelectedID(s.id); setCustomAddr(""); }}
                                className={cn(
                                    "group relative flex w-full items-center gap-3 rounded-[3px] border px-4 py-3 text-left transition-all",
                                    isSelected
                                        ? "border-kitsu-orange bg-kitsu-orange-dim"
                                        : "border-kitsu-s4 bg-kitsu-s1 hover:border-kitsu-s5 hover:bg-kitsu-s2"
                                )}
                            >
                                {/* Active indicator bar */}
                                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-kitsu-orange" />}

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-kitsu-s3 text-lg">
                                    {s.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className={cn("text-sm font-bold truncate font-sans", isSelected ? "text-kitsu-orange" : "text-fg")}>
                                        {s.label}
                                    </div>
                                    <div className="font-mono text-[10px] text-fg-dim uppercase tracking-wide">
                                        {s.addr}
                                    </div>
                                </div>

                                {/* Ping Indicator */}
                                <div className="flex items-center gap-2 rounded-[2px] bg-black/20 px-2 py-1">
                                    <StatusDot status={isOnline ? "online" : "offline"} className="size-1.5" />
                                    <span className={cn("font-mono text-[10px]", isOnline ? "text-kitsu-online" : "text-fg-dim")}>
                            {ping === "checking" ? "..." : ping?.toUpperCase()}
                        </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="mb-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-kitsu-s4" />
                    <span className="font-mono text-[10px] text-fg-dim">OR MANUAL ENTRY</span>
                    <div className="h-px flex-1 bg-kitsu-s4" />
                </div>

                <div className="mb-6">
                    <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">Target Address</label>
                    <div className="relative">
                        <Input
                            placeholder="127.0.0.1:8090"
                            value={customAddr}
                            onChange={(e) => { setCustomAddr(e.target.value); setSelectedID(null); }}
                            className="pl-9 font-mono"
                        />
                        <Wifi size={14} className="absolute left-3 top-2.5 text-fg-dim" />
                    </div>
                </div>

                <Button
                    size="lg"
                    className="w-full"
                    disabled={!activeAddr || connecting}
                    onClick={handleConnect}
                    loading={connecting}
                >
                    INITIATE CONNECTION
                </Button>

                <div className="mt-8 text-center font-mono text-[9px] text-fg-dim">
                    KitsuLAN CLIENT v0.1.0 // SECURE PROTOCOL
                </div>
            </div>
        </div>
    );
}