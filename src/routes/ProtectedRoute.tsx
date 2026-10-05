import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div role="status" className="min-h-screen grid place-items-center">Restaurando sesión…</div>;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
