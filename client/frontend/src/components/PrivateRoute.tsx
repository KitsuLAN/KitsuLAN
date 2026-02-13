/**
 * src/components/PrivateRoute.tsx
 * Редиректит на /auth (а не на /) если не залогинен.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useIsAuthenticated } from "@/stores/authStore";

export function PrivateRoute() {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />;
}
