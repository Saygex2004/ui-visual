// Shared loading/empty/error/success/info state display (Execution Plan
// Phase 10, FRONTEND.md §7: "designed states with copy in the catalog —
// never blank panels or raw error text"). Replaces ~10 features' worth of
// bespoke inline <p>/<div> status text with one token-driven primitive.
// `info` is a small addition beyond the phase brief's four named states —
// a handful of call sites (e.g. "this listing was removed") are neither
// loading, empty, an error, nor a success confirmation; forcing them into
// one of those four would misrepresent the message.
//
// `role` defaults per variant but is overridable — the pre-Phase-10 app
// deliberately used `role="alert"` for every error and `role="status"` for
// success/progress messages; that split is preserved exactly, not flattened.
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Inbox, Info, Loader2 } from 'lucide-react';
import './statusDisplay.css';

export type StatusVariant = 'loading' | 'empty' | 'error' | 'success' | 'info';

const DEFAULT_ROLE: Record<StatusVariant, 'status' | 'alert'> = {
  loading: 'status',
  empty: 'status',
  error: 'alert',
  success: 'status',
  info: 'status',
};

const DEFAULT_ICON: Record<StatusVariant, ReactNode> = {
  loading: <Loader2 aria-hidden="true" size={18} className="status-display-spin" />,
  empty: <Inbox aria-hidden="true" size={18} />,
  error: <AlertCircle aria-hidden="true" size={18} />,
  success: <CheckCircle2 aria-hidden="true" size={18} />,
  info: <Info aria-hidden="true" size={18} />,
};

export interface StatusDisplayProps {
  variant: StatusVariant;
  message: string;
  icon?: ReactNode;
  role?: 'status' | 'alert';
  className?: string;
}

export function StatusDisplay({ variant, message, icon, role, className }: StatusDisplayProps) {
  const classes = ['status-display', `status-display-${variant}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} role={role ?? DEFAULT_ROLE[variant]}>
      {icon ?? DEFAULT_ICON[variant]}
      <span>{message}</span>
    </div>
  );
}
