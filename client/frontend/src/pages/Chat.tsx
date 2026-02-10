import { useNavigate } from "react-router-dom";

export default function Chat() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white flex-col gap-4">
      <h1 className="text-3xl font-bold">Добро пожаловать, {username}! 👋</h1>
      <p className="text-gray-400">Вы успешно авторизовались в системе Core.</p>
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
      >
        Выйти
      </button>
    </div>
  );
}
