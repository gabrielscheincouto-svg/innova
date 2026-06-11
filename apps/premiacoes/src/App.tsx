import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit, useAuth } from '@innova/auth';
import { Toast, ConfirmDialog, Spinner, ResetPasswordPage } from '@innova/ui';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Colaboradores } from './pages/Colaboradores';
import { Criterios } from './pages/Criterios';
import { Avaliacao } from './pages/Avaliacao';
import { Folha } from './pages/Folha';
import { Contratos } from './pages/Contratos';
import { Calculadora } from './pages/Calculadora';
import { Configuracoes } from './pages/Configuracoes';
import { Manual } from './pages/Manual';

export default function App() {
  useAuthInit();
  const loading = useAuth((s) => s.loading);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Spinner size={32} className="text-accent-500" /></div>;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPasswordPage productLabel="Innova /Premiações" loginPath="/premios/login" />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="/colaboradores" element={<ErrorBoundary><Colaboradores /></ErrorBoundary>} />
            <Route path="/criterios" element={<ErrorBoundary><Criterios /></ErrorBoundary>} />
            <Route path="/avaliacao" element={<ErrorBoundary><Avaliacao /></ErrorBoundary>} />
            <Route path="/folha" element={<ErrorBoundary><Folha /></ErrorBoundary>} />
            <Route path="/contratos" element={<ErrorBoundary><Contratos /></ErrorBoundary>} />
            <Route path="/calculadora" element={<ErrorBoundary><Calculadora /></ErrorBoundary>} />
            <Route path="/configuracoes" element={<ErrorBoundary><Configuracoes /></ErrorBoundary>} />
            <Route path="/manual" element={<ErrorBoundary><Manual /></ErrorBoundary>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
      <ConfirmDialog />
    </ErrorBoundary>
  );
}
