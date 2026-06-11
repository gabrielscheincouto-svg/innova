import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Estado global do app NR1:
 *   currentCompanyId · empresa selecionada no company switcher.
 *   Pra perfil 'proprietario' é a empresa dele.
 *   Pra perfil 'profissional' / 'gestor' pode ser a empresa-cliente sendo atendida.
 *   Null = nenhuma selecionada (caso comum no profissional, que opera várias).
 */
interface Nr1State {
  currentCompanyId: string | null;
  setCompany: (id: string | null) => void;
}

export const useNr1 = create<Nr1State>()(
  persist(
    (set) => ({
      currentCompanyId: null,
      setCompany: (id) => set({ currentCompanyId: id }),
    }),
    { name: 'innova-nr1-state' }
  )
);
