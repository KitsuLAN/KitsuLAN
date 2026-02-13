import { Outlet } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useUsername, useAuthActions } from "@/stores/authStore";

export default function MainLayout() {
  const username = useUsername();
  const { logout } = useAuthActions();

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Левая панель серверов */}
      <nav className="w-18 bg-zinc-900 flex flex-col items-center py-4 gap-4 border-r border-zinc-800">
        <div className="w-12 h-12 bg-indigo-600 rounded-3xl flex items-center justify-center hover:rounded-2xl transition-all cursor-pointer">
          🦊
        </div>
        <Separator className="w-8 bg-zinc-700" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-12 h-12 bg-zinc-700 rounded-full hover:rounded-3xl transition-all flex items-center justify-center text-zinc-400 hover:text-white"
          >
            S{i}
          </div>
        ))}
      </nav>

      {/* Панель каналов */}
      <div className="w-60 bg-zinc-950/50 flex flex-col border-r border-zinc-800">
        <div className="h-12 border-b border-zinc-800 flex items-center px-4 font-semibold">
          KitsuLAN Dev
        </div>
        <ScrollArea className="flex-1 px-2 py-4">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">
              Text Channels
            </h3>
            <div className="space-y-1">
              {["general", "dev", "random"].map((ch) => (
                <div
                  key={ch}
                  className="px-2 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 rounded cursor-pointer text-sm"
                >
                  # {ch}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Панель пользователя */}
        <div className="h-14 bg-zinc-900/50 flex items-center px-3 gap-3 border-t border-zinc-800">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-indigo-900 text-indigo-100">
              {username?.slice(0, 2).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">
              {username ?? "User"}
            </div>
            <div className="text-xs text-zinc-500">Online</div>
          </div>
          <button
            onClick={logout}
            className="text-zinc-500 hover:text-red-400 text-xs transition"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Основная область контента */}
      <main className="flex-1 flex flex-col bg-background">
        <header className="h-12 border-b border-zinc-800 flex items-center px-6 shadow-sm">
          <span className="text-zinc-400 mr-2">#</span>
          <span className="font-semibold">general</span>
        </header>
        <div className="flex-1 overflow-hidden relative">
          <Outlet /> {/* Сюда будет рендериться Chat и другие страницы */}
        </div>
      </main>
    </div>
  );
}
