import { useUsername } from "@/stores/authStore";

export default function Chat() {
  const username = useUsername();

  return (
    <div className="h-full flex items-center justify-center flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">Добро пожаловать, {username}! 👋</h1>
      <p className="text-muted-foreground">
        Вы успешно авторизовались в системе Core.
      </p>
      {/* Кнопка выхода уже есть в MainLayout, здесь её быть не должно */}
    </div>
  );
}
