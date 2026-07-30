// Confirmation dialog primitive (Execution Plan Phase 13) — replaces the
// remaining `window.confirm`/`window.alert` call sites (archive refresh
// report, Svuota archivio, chat close) with a designed, keyboard-trapped
// modal. Controlled by the caller; all copy arrives via props so i18n stays
// at the call site. `cancelLabel` omitted = acknowledgement-only mode (the
// alert() replacement).
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from './Dialog';
import { Button } from './Button';
import './confirmDialog.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="ui-confirm-overlay" />
        <DialogContent className="ui-confirm">
          <DialogTitle className="ui-confirm-title">{title}</DialogTitle>
          {description ? <p className="ui-confirm-description">{description}</p> : null}
          <div className="ui-confirm-actions">
            {cancelLabel ? (
              <DialogClose asChild>
                <Button severity="secondary">{cancelLabel}</Button>
              </DialogClose>
            ) : null}
            <Button
              severity={destructive ? 'danger' : 'primary'}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
