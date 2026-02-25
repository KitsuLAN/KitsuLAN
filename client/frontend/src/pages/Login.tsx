import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LogIn, UserPlus, Server } from "lucide-react";

import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { useIsAuthenticated } from "@/modules/auth/authStore";
import { useServerAddress } from "@/modules/server/serverStore";
import { AuthController } from "@/modules/auth/AuthController";
import { handleApiError } from "@/api/errors";

const schema = z.object({
  username: z.string().min(1, "REQ_USERNAME"),
  password: z.string().min(1, "REQ_PASSWORD"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const serverAddress = useServerAddress();
  const [mode, setMode] = useState<"login" | "register">("login");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isAuthenticated) navigate("/app");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!serverAddress) navigate("/");
  }, [serverAddress, navigate]);

  const onSubmit = async (data: FormData) => {
    try {
      if (mode === "register") {
        await AuthController.register(data.username, data.password);
        toast.success("ACCOUNT CREATED :: READY FOR LOGIN");
        setMode("login");
        reset({ username: data.username, password: "" });
      } else {
        await AuthController.login(data.username, data.password);
      }
    } catch (err) {
      handleApiError(err);
    }
  };

  return (
      <div className="relative flex min-h-screen w-full items-center justify-center bg-kitsu-bg p-6 text-fg overflow-hidden">
        {/* Background Grid */}
        <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px"
            }}
        />

        <div className="relative z-10 w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[3px] border border-kitsu-orange bg-kitsu-orange-dim text-4xl shadow-[0_0_20px_-5px_var(--kitsu-orange)]">
              🦊
            </div>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-white">
              KitsuLAN <span className="text-kitsu-orange">LINK</span>
            </h1>
            <div className="mt-2 flex items-center gap-2 rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 px-3 py-1 font-mono text-xs text-fg-dim">
              <Server size={12} />
              <span>NODE: {serverAddress}</span>
            </div>
          </div>

          {/* Card */}
          <div className="overflow-hidden rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 shadow-2xl">
            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-kitsu-s4">
              <button
                  onClick={() => { setMode("login"); reset(); }}
                  className={`h-10 font-mono text-xs font-bold uppercase tracking-widest transition-colors ${
                      mode === "login"
                          ? "bg-kitsu-s2 text-kitsu-orange border-b-2 border-kitsu-orange"
                          : "bg-kitsu-s0 text-fg-dim hover:text-fg hover:bg-kitsu-s2"
                  }`}
              >
                Login
              </button>
              <button
                  onClick={() => { setMode("register"); reset(); }}
                  className={`h-10 font-mono text-xs font-bold uppercase tracking-widest transition-colors ${
                      mode === "register"
                          ? "bg-kitsu-s2 text-kitsu-orange border-b-2 border-kitsu-orange"
                          : "bg-kitsu-s0 text-fg-dim hover:text-fg hover:bg-kitsu-s2"
                  }`}
              >
                Register
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                    Identity
                  </label>
                  <Input
                      placeholder="username"
                      autoComplete="username"
                      disabled={isSubmitting}
                      {...register("username")}
                  />
                  {errors.username && <p className="text-xs text-kitsu-dnd">{errors.username.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                    Access Key
                  </label>
                  <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      {...register("password")}
                  />
                  {errors.password && <p className="text-xs text-kitsu-dnd">{errors.password.message}</p>}
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full" loading={isSubmitting}>
                    {mode === "login" ? (
                        <>AUTHENTICATE <LogIn size={14} /></>
                    ) : (
                        <>INITIALIZE <UserPlus size={14} /></>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            <div className="border-t border-kitsu-s4 bg-kitsu-s0 px-6 py-3 text-center">
              <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="font-mono text-[10px] text-fg-dim hover:text-kitsu-orange hover:underline transition-colors"
              >
                ← DISCONNECT FROM NODE
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}