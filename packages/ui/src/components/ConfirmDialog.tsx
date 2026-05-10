import { create } from 'zustand';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'default' | 'danger';
  resolve: ((v: boolean) => void) | null;
  show: (opts: ConfirmOpts) => Promise<boolean>;
  close: (v: boolean) => void;
}

interface ConfirmOpts {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'danger';
}

const useStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirmar',
  variant: 'default',
  resolve: null,
  show: ({ title, description, confirmLabel = 'Confirmar', variant = 'default' }) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, title, description, confirmLabel, variant, resolve });
    }),
  close: (v: boolean) => {
    get().resolve?.(v);
    set({ open: false, resolve: null });
  },
}));

export function useConfirm() {
  return useStore((s) => s.show);
}

export function ConfirmDialog() {
  const { open, title, description, confirmLabel, variant, close } = useStore();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-ink-900/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-4xl shadow-2xl max-w-md w-full p-7">
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-3 text-sm text-ink-700">{description}</p>
        <div className="flex gap-3 mt-7 justify-end">
          <button onClick={() => close(false)} className="btn btn-ghost">
            Cancelar
          </button>
          <button
            onClick={() => close(true)}
            className={`btn ${variant === 'danger' ? 'bg-danger text-white hover:bg-danger/90' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
