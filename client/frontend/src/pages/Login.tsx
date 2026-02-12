import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Login as GoLogin,
  Register as GoRegister,
} from "../../wailsjs/go/main/App";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        // Вызываем Go (gRPC Register)
        await GoRegister(username, password);
        alert("Регистрация успешна! Теперь войдите.");
        setIsRegister(false);
      } else {
        // Вызываем Go (gRPC Login)
        const token = await GoLogin(username, password);

        // Сохраняем токен (пока в localStorage, потом переделаем)
        localStorage.setItem("token", token);
        localStorage.setItem("username", username);

        navigate("/chat");
      }
    } catch (err: any) {
      console.error(err);
      // Wails возвращает ошибки как строки
      setError(typeof err === "string" ? err : "Ошибка соединения с сервером");
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-white">
          {isRegister ? "Создать аккаунт (gRPC)" : "Вход в KitsuLAN"}
        </h2>

        {error && (
          <div className="mb-4 p-2 bg-red-500/20 text-red-200 text-sm rounded border border-red-500/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Никнейм
            </label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-900 border border-gray-700 focus:border-accent outline-none text-white transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Пароль
            </label>
            <input
              type="password"
              className="w-full p-2 rounded bg-gray-900 border border-gray-700 focus:border-accent outline-none text-white transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded transition duration-200 cursor-pointer"
          >
            {isRegister ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-400">
          {isRegister ? "Уже есть аккаунт? " : "Нет аккаунта? "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-indigo-400 hover:underline cursor-pointer"
          >
            {isRegister ? "Войти" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
