import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isProfileComplete, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Verificando sesión...</p>
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isProfileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Verificando credenciales de administrador...</p>
      </div>
    );
  }

  // Anonymous participants cannot access admin panel
  if (user && user.isAnonymous) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
