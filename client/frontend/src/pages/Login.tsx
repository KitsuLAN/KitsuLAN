import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Адрес нашего Go API
  // TODO: Вынести в конфигурацию
  const API_URL = "http://localhost:8080/api/auth";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint = isRegister ? "/register" : "/login";
      const res = await axios.post(`${API_URL}${endpoint}`, {
        username,
        password,
      });

      if (isRegister) {
        // Если зарегистрировались, сразу пробуем войти или просим войти
        setIsRegister(false);
        alert("Регистрация успешна! Теперь войдите.");
      } else {
        // Если вошли - сохраняем токен
        const token = res.data.token;
        localStorage.setItem("token", token);
        localStorage.setItem("username", username);

        // Переходим в чат
        navigate("/chat");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Произошла ошибка");
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-white">
          {isRegister ? "Создать аккаунт" : "Вход в KitsuLAN"}
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
            className="w-full py-2 px-4 bg-accent hover:bg-indigo-600 text-white font-semibold rounded transition duration-200"
          >
            {isRegister ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-400">
          {isRegister ? "Уже есть аккаунт? " : "Нет аккаунта? "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-accent hover:underline"
          >
            {isRegister ? "Войти" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
