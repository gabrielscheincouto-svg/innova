import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit, useAuth } from '@innova/auth';
import { Toast, ConfirmDialog, Spinner, ResetPasswordPage } from '@innova/ui';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Empresas } from './pages/Empresas';
import { Usuarios } from './pages/Usuarios';
import { AuditLog } from './pages/AuditLog';
import { Configuracoes } from './pages/Configuracoes';
import { Manual } from './pages/Manual';

export default function App() {
  useAuthInit();
  const loading = useAuth((s) => s.loading);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner size={32} className="text-accent-500" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPasswordPage productLabel="Innova /Gestor" loginPath="/gestor/login" />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/auditoria" element={<AuditLog />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/manual" element={<Manual />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
      <ConfirmDialog />
    </>
  );
}
