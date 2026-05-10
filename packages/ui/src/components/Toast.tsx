import { create } from 'zustand';
import { useEffect } from 'react';

interface ToastItem {
  id: string;
  message: string;
  variant: 'ok' | 'warn' | 'danger';
}

interface ToastState {
  items: ToastItem[];
  push: (msg: string, variant?: ToastItem['variant']) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (message, variant = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    set({ items: [...get().items, { id, message, variant }] });
    setTimeout(() => get().dismiss(id), 3000);
  },
  dismiss: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
}));

export function useToast() {
  return useToastStore((s) => s.push);
}

export function Toast() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {items.map((it) => (
        <div
          key={it.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg animate-fade-in min-w-[280px] max-w-md ${
            it.variant === 'ok'
              ? 'bg-ink-900 text-white'
              : it.variant === 'warn'
              ? 'bg-warn text-ink-900'
              : 'bg-danger text-white'
          }`}
        >
          {it.variant === 'ok' && <CheckIcon />}
          {it.variant === 'warn' && <AlertIcon />}
          {it.variant === 'danger' && <XIcon />}
          <span className="flex-1">{it.message}</span>
          <button onClick={() => dismiss(it.id)} className="opacity-60 hover:opacity-100">
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
