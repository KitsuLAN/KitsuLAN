import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogIn, UserPlus, User, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuthActions, useIsAuthenticated } from "@/stores/authStore";
import { useEffect, useState } from "react";

const authSchema = z.object({
  username: z.string().min(1, "Введите никнейм"),
  password: z.string().min(1, "Введите пароль"),
});

type AuthForm = z.infer<typeof authSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, register: registerAction } = useAuthActions();
  const isAuthenticated = useIsAuthenticated();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  // Редирект, если уже залогинен
  useEffect(() => {
    if (isAuthenticated) navigate("/chat");
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: AuthForm) => {
    try {
      if (isRegisterMode) {
        await registerAction(data.username, data.password);
        toast.success("Аккаунт создан", {
          description: "Теперь вы можете войти",
        });
        setIsRegisterMode(false);
        reset();
      } else {
        await login(data.username, data.password);
        toast.success("Вход выполнен");
        // useAuthStore обновился, useEffect сработает и перенаправит
      }
    } catch (err) {
      const message =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : "Неизвестная ошибка";
      toast.error("Ошибка", { description: message });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/95 backdrop-blur shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">
              {isRegisterMode ? "Регистрация" : "KitsuLAN"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isRegisterMode
                ? "Придумайте никнейм и пароль"
                : "Введите данные для входа"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="username">Никнейм</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Например: KitsuFan"
                    className="pl-9 h-11 bg-background/50"
                    autoComplete="username"
                    disabled={isSubmitting}
                    {...register("username")}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-11 bg-background/50"
                    autoComplete={
                      isRegisterMode ? "new-password" : "current-password"
                    }
                    disabled={isSubmitting}
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full text-base font-semibold transition-transform hover:scale-[1.02]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Загрузка..."
                ) : isRegisterMode ? (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Создать аккаунт
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Войти
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {isRegisterMode ? "Уже есть аккаунт? " : "Нет аккаунта? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    reset();
                  }}
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80 transition"
                >
                  {isRegisterMode ? "Войти" : "Создать"}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
