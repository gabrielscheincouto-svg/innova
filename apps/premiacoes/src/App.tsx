import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit, useAuth } from '@innova/auth';
import { Toast, ConfirmDialog, Spinner } from '@innova/ui';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Colaboradores } from './pages/Colaboradores';
import { Criterios } from './pages/Criterios';
import { Avaliacao } from './pages/Avaliacao';
import { Folha } from './pages/Folha';
import { Contratos } from './pages/Contratos';
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
            <Route path="/colaboradores" element={<Colaboradores />} />
            <Route path="/criterios" element={<Criterios />} />
            <Route path="/avaliacao" element={<Avaliacao />} />
            <Route path="/folha" element={<Folha />} />
            <Route path="/contratos" element={<Contratos />} />
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
