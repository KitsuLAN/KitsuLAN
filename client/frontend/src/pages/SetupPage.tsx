import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WailsAPI } from "@/api/wails";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { handleApiError } from "@/api/errors";
import { toast } from "sonner";
import { useServerAddress } from "@/modules/server/serverStore";
import { Terminal, Server, ArrowRight } from "lucide-react";

export function SetupPage() {
    const navigate = useNavigate();
    const serverAddress = useServerAddress();
    const [domain, setDomain] = useState("localhost");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        try {
            await WailsAPI.SetupRealm(domain, name);
            toast.success("NODE INITIALIZED SUCCESSFULLY");
            navigate("/auth");
        } catch (e) {
            handleApiError(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-kitsu-bg p-6 text-fg overflow-hidden">
            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                    backgroundSize: "40px 40px"
                }}
            />

            <button
                type="button"
                onClick={() => navigate("/")}
                className="absolute left-8 top-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-fg-dim transition-colors hover:text-kitsu-orange"
            >
                ← ABORT SETUP
            </button>

            <div className="relative z-10 w-full max-w-[460px]">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 text-kitsu-orange shadow-lg">
                        <Terminal size={32} strokeWidth={1.5} />
                    </div>
                    <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-white">
                        Unconfigured Node Detected
                    </h1>
                    <p className="mt-2 font-mono text-xs text-fg-dim">
                        Target <span className="text-kitsu-orange">{serverAddress}</span> requires initialization parameters.
                    </p>
                </div>

                <div className="rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 shadow-2xl">
                    <div className="flex items-center gap-2 border-b border-kitsu-s4 bg-kitsu-s2 px-4 py-2">
                        <Server size={14} className="text-fg-dim" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                            Realm Configuration
                        </span>
                    </div>

                    <div className="space-y-5 p-6">
                        <div className="space-y-1.5">
                            <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                                Network Domain (or IP)
                            </label>
                            <Input
                                value={domain}
                                onChange={e => setDomain(e.target.value)}
                                placeholder="kitsu.myhome.lan"
                                className="font-mono"
                            />
                            <p className="font-mono text-[9px] text-fg-muted">
                                Used for external routing and invite link generation.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                                Realm Display Name
                            </label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Motherbase Alpha"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="border-t border-kitsu-s4 bg-kitsu-s0 p-4">
                        <Button
                            className="w-full font-bold"
                            size="lg"
                            disabled={!name || loading}
                            onClick={handleSetup}
                            loading={loading}
                        >
                            INITIALIZE SERVER <ArrowRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}