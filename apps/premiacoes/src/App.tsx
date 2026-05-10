import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit, useAuth } from '@innova/auth';
import { Toast, ConfirmDialog, Spinner } from '@innova/ui';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Programas } from './pages/Programas';
import { Atas } from './pages/Atas';
import { Calculadora } from './pages/Calculadora';
import { Configuracoes } from './pages/Configuracoes';

export default function App() {
  useAuthInit();
  const loading = useAuth((s) => s.loading);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Spinner size={32} className="text-accent-500" /></div>;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/programas" element={<Programas />} />
            <Route path="/atas" element={<Atas />} />
            <Route path="/calculadora" element={<Calculadora />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
      <ConfirmDialog />
    </>
  );
}
