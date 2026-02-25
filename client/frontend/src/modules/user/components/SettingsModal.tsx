import { useState } from "react";
import { Modal } from "@/components/modals/Modal";
import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { Avatar, AvatarFallback } from "@/uikit/avatar";
import { useUsername, useAuthStore } from "@/modules/auth/authStore";
import { User, Volume2, Shield, LogOut } from "lucide-react";
import { AuthController } from "@/modules/auth/AuthController";
import { WailsAPI } from "@/api/wails";
import { toast } from "sonner";
import { cn } from "@/uikit/lib/utils";

const TABS = [
    { id: "profile", label: "Профиль", icon: User },
    { id: "voice", label: "Голос и Видео", icon: Volume2 },
    { id: "security", label: "Безопасность", icon: Shield },
];

export function SettingsModal({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState("profile");
    const username = useUsername();

    // Local state for profile form
    const [nickname, setNickname] = useState("");

    const handleSaveProfile = async () => {
        try {
            // await WailsAPI.UpdateProfile(...)
            toast.success("PROFILE UPDATED");
        } catch(e) {
            toast.error("UPDATE FAILED");
        }
    };

    return (
        <Modal title="USER :: CONFIGURATION" onClose={onClose} className="max-w-[700px] p-0">
            <div className="flex h-[400px]">
                {/* Sidebar */}
                <aside className="w-[200px] shrink-0 border-r border-kitsu-s4 bg-kitsu-s1 p-2">
                    <div className="mb-4 px-2 pt-2 pb-2">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                            Categories
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-[3px] px-3 py-1.5 text-left font-sans text-xs font-bold transition-colors",
                                    activeTab === tab.id
                                        ? "bg-kitsu-s3 text-fg"
                                        : "text-fg-muted hover:bg-kitsu-s2 hover:text-fg"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto border-t border-kitsu-s4 pt-2">
                        <button
                            onClick={() => { onClose(); AuthController.logout(); }}
                            className="flex w-full items-center gap-2 rounded-[3px] px-3 py-1.5 text-left font-sans text-xs font-bold text-kitsu-dnd hover:bg-kitsu-dnd/10"
                        >
                            <LogOut size={14} />
                            Выйти
                        </button>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto bg-kitsu-bg p-6">
                    {activeTab === "profile" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-4 font-mono text-sm font-bold uppercase tracking-widest text-fg">
                                    User Profile
                                </h3>
                                <div className="flex items-start gap-4">
                                    <div className="group relative">
                                        <Avatar size="lg" className="h-20 w-20">
                                            <AvatarFallback className="text-2xl">{username?.slice(0,2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer text-xs font-bold text-white">
                                            CHANGE
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                                                Username
                                            </label>
                                            <div className="font-mono text-sm text-fg p-2 border border-kitsu-s4 bg-kitsu-s1 rounded-[3px] opacity-60">
                                                {username} <span className="text-fg-dim ml-2">#0000</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                                                Nickname
                                            </label>
                                            <Input
                                                placeholder={username || ""}
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-kitsu-s4 pt-4 flex justify-end">
                                <Button onClick={handleSaveProfile}>SAVE CHANGES</Button>
                            </div>
                        </div>
                    )}

                    {activeTab === "voice" && (
                        <div className="flex h-full items-center justify-center text-fg-dim font-mono text-xs">
                            AUDIO DEVICE SETTINGS UNAVAILABLE
                        </div>
                    )}
                </main>
            </div>
        </Modal>
    );
}