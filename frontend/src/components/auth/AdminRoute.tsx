import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-abyss-black">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div>
      </div>
    );
  }

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}