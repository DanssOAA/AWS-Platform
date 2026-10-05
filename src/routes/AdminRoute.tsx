import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute() {
  const { user, session, loading } = useAuth();
  if (loading) return <p role="status">Comprobando acceso…</p>;
  if (!session) return <Navigate to="/login" replace />;
  return user?.app_metadata?.cloudops_role === 'admin'
    ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
