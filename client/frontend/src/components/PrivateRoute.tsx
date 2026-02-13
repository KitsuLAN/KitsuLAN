import { Navigate, Outlet } from "react-router-dom";
import { useIsAuthenticated } from "@/stores/authStore";

export function PrivateRoute() {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
}
