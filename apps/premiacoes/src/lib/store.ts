import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Estado global do app Premiações:
 * - currentCompanyId · empresa selecionada (usuário gestor pode trocar)
 * - currentCompetencia · primeiro dia do mês 'YYYY-MM-01' (filtro de avaliação/folha)
 */

function firstDayOfMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

interface PremiosState {
  currentCompanyId: string | null;
  currentCompetencia: string; // 'YYYY-MM-01'
  setCompany: (id: string | null) => void;
  setCompetencia: (yyyymm01: string) => void;
}

export const usePremios = create<PremiosState>()(
  persist(
    (set) => ({
      currentCompanyId: null,
      currentCompetencia: firstDayOfMonth(),
      setCompany: (id) => set({ currentCompanyId: id }),
      setCompetencia: (c) => set({ currentCompetencia: c }),
    }),
    { name: 'innova-premios-state' }
  )
);

export function formatCompetencia(c: string): string {
  const d = new Date(c + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function shiftCompetencia(c: string, delta: number): string {
  const d = new Date(c + 'T12:00:00');
  d.setMonth(d.getMonth() + delta);
  return firstDayOfMonth(d);
}
