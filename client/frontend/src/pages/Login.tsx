/**
 * src/pages/Login.tsx
 * Изменения от оригинала:
 * - Убран framer-motion (лишняя зависимость для простой анимации)
 * - Таб-переключатель вместо ссылки внизу
 * - Используется WailsAPI shim
 * - ServerGuard теперь перенаправляет сюда, а не сюда (роут /auth)
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/uikit/button";
import { Input } from "@/uikit/input";
import { Label } from "@/uikit/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/uikit/card";
import { useIsAuthenticated } from "@/modules/auth/authStore";
import { useServerAddress } from "@/modules/server/serverStore";
import {AuthController} from "@/modules/auth/AuthController";

const schema = z.object({
  username: z.string().min(1, "Введите никнейм"),
  password: z.string().min(1, "Введите пароль"),
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

  // Редиректы
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
        toast.success("Аккаунт создан", { description: "Теперь войдите" });
        setMode("login");
        reset({ username: data.username, password: "" });
      } else {
        await AuthController.login(data.username, data.password);
        // navigate произойдёт через useEffect выше
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : String(err) || "Неизвестная ошибка";
      toast.error("Ошибка", { description: msg });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-kitsu-bg p-6">
      {/* Сетка */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--kitsu-orange) 1px, transparent 1px), linear-gradient(90deg, var(--kitsu-orange) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {serverAddress}
        </button>

        <Card className="border-kitsu-s4 bg-kitsu-s1">
          <CardHeader className="pb-3 text-center">
            <div className="mb-2 text-4xl">🦊</div>
            <CardTitle className="text-xl">
              {mode === "login" ? "Добро пожаловать" : "Регистрация"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Войдите в KitsuLAN"
                : "Создайте аккаунт на сервере"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Переключатель режима */}
            <div className="flex rounded-md bg-kitsu-bg p-1 gap-1">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    reset();
                  }}
                  className={`flex-1 rounded py-1.5 text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-kitsu-s3 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "login" ? "Войти" : "Создать"}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="username"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Никнейм
                </Label>
                <Input
                  id="username"
                  placeholder="KitsuFan"
                  className="bg-kitsu-bg"
                  autoComplete="username"
                  disabled={isSubmitting}
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Пароль
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-kitsu-bg"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  disabled={isSubmitting}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Загрузка…"
                ) : mode === "login" ? (
                  <>
                    <LogIn className="size-4" /> Войти
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" /> Создать аккаунт
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
