import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      {icon && (
        <div className="w-16 h-16 mx-auto mb-5 rounded-3xl bg-accent-50 grid place-items-center text-accent-500">
          {icon}
        </div>
      )}
      <h3 className="font-display text-2xl">{title}</h3>
      {description && <p className="mt-2 text-sm text-ink-700 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
