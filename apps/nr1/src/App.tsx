import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit, useAuth } from '@innova/auth';
import { Toast, ConfirmDialog, Spinner, ResetPasswordPage } from '@innova/ui';
import { Layout } from './components/Layout';
import { ProtectedRoute, ProfissionalOnlyRoute, ProprietarioOnlyRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { ClienteDetail } from './pages/ClienteDetail';
import { Colaboradores } from './pages/Colaboradores';
import { Manual } from './pages/Manual';
import { Avaliacoes } from './pages/Avaliacoes';
import { NovaAvaliacao } from './pages/NovaAvaliacao';
import { IPAR } from './pages/IPAR';
import { PlanoAcao } from './pages/PlanoAcao';
import { Comunicacoes } from './pages/Comunicacoes';
import { Relatorios } from './pages/Relatorios';
import { Configuracoes } from './pages/Configuracoes';
// Páginas exclusivas do proprietário
import { MeusLaudos } from './pages/MeusLaudos';
import { MeusIndicadores } from './pages/MeusIndicadores';
import { MinhaEmpresa } from './pages/MinhaEmpresa';
// Colaborador (público)
import { Colaborador } from './pages/colaborador/Colaborador';

export default function App() {
  useAuthInit();
  const loading = useAuth((s) => s.loading);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Spinner size={32} className="text-accent-500" /></div>;
  }

  return (
    <>
      <Routes>
        {/* ========== Rota pública do colaborador (token-based) ========== */}
        <Route path="/c/:token" element={<Colaborador />} />

        {/* ========== Login ========== */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPasswordPage productLabel="Innova /NR1" loginPath="/nr1/login" />} />

        {/* ========== Sistema autenticado ========== */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Comum a todos (com guards internos para writes) */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/comunicacoes" element={<Comunicacoes />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/manual" element={<Manual />} />

            {/* Rotas exclusivas do PROPRIETÁRIO (read-only) */}
            <Route element={<ProprietarioOnlyRoute />}>
              <Route path="/meus-laudos" element={<MeusLaudos />} />
              <Route path="/meus-indicadores" element={<MeusIndicadores />} />
              <Route path="/minha-empresa" element={<MinhaEmpresa />} />
            </Route>

            {/* Rotas exclusivas do PROFISSIONAL (operacional) */}
            <Route element={<ProfissionalOnlyRoute />}>
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClienteDetail />} />
              <Route path="/colaboradores" element={<Colaboradores />} />
              <Route path="/avaliacoes" element={<Avaliacoes />} />
              <Route path="/avaliacoes/nova" element={<NovaAvaliacao />} />
              <Route path="/ipar" element={<IPAR />} />
              <Route path="/plano-acao" element={<PlanoAcao />} />
              <Route path="/relatorios" element={<Relatorios />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
      <ConfirmDialog />
    </>
  );
}
