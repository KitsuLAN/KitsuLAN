import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogIn, UserPlus, User, Lock } from "lucide-react";

// Wails bindings
import {
  Login as GoLogin,
  Register as GoRegister,
} from "../../wailsjs/go/main/App";

// UI Components
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

// --- 1. Схема валидации (Zod) ---
const authSchema = z.object({
  username: z
    .string()
    .min(1, "Введите никнейм")
    .max(50, "Слишком длинный никнейм"),
  password: z
    .string()
    .min(1, "Введите пароль")
    .min(6, "Пароль должен быть не короче 6 символов"),
});

type AuthForm = z.infer<typeof authSchema>;

// --- 2. Утилита для ошибок (можно вынести в shared) ---
function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "Не удалось подключиться к серверу";
}

// --- 3. Кастомный хук для аутентификации ---
function useAuth() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: AuthForm) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const action = isRegister ? GoRegister : GoLogin;
      const result = await action(data.username, data.password);

      if (isRegister) {
        toast.success("Аккаунт создан", {
          description: "Теперь вы можете войти",
        });
        setIsRegister(false);
        form.reset();
      } else {
        // Хранилище лучше вынести в отдельный модуль
        localStorage.setItem("token", result);
        localStorage.setItem("username", data.username);
        toast.success("Вход выполнен");
        navigate("/chat");
      }
    } catch (err) {
      toast.error("Ошибка", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    isRegister,
    setIsRegister,
    isLoading,
    onSubmit,
  };
}

// --- 4. Компонент (только отрисовка) ---
export default function Login() {
  const { form, isRegister, setIsRegister, isLoading, onSubmit } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-background via-background to-secondary/20 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/95 backdrop-blur shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">
              {isRegister ? "Регистрация" : "KitsuLAN"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isRegister
                ? "Придумайте никнейм и пароль"
                : "Введите данные для входа"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="grid gap-5">
              {/* Поле Никнейм */}
              <div className="grid gap-2">
                <Label htmlFor="username">Никнейм</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Например: KitsuFan"
                    className="pl-9 h-11 bg-background/50 transition-shadow focus-visible:ring-2"
                    disabled={isLoading}
                    autoFocus
                    {...register("username")}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Поле Пароль */}
              <div className="grid gap-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-11 bg-background/50 transition-shadow focus-visible:ring-2"
                    disabled={isLoading}
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
                disabled={isLoading}
              >
                {isLoading ? (
                  "Загрузка..."
                ) : isRegister ? (
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
                {isRegister ? "Уже есть аккаунт? " : "Нет аккаунта? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    form.clearErrors();
                  }}
                  className="font-medium text-primary underline underline-offset-4 transition hover:opacity-80"
                >
                  {isRegister ? "Войти" : "Создать"}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
