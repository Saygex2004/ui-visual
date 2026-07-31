// Single-field prompt dialog (Execution Plan Phase 13) — the in-application
// replacement for `window.prompt`, currently the chat composer's "insert a
// link" step. Same chrome as ConfirmDialog; the value is local to the dialog
// and handed back on submit, so the caller stays stateless about typing.
import { useEffect, useState, type FormEvent } from 'react';
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from './Dialog';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { Field } from './Field';
import './confirmDialog.css';

export interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  inputType?: 'text' | 'url';
  onSubmit: (value: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function PromptDialog({
  open,
  title,
  label,
  placeholder,
  confirmLabel,
  cancelLabel,
  inputType = 'text',
  onSubmit,
  onOpenChange,
}: PromptDialogProps) {
  const [value, setValue] = useState('');

  // Each opening starts from an empty field — a stale value from a previous
  // use is never what the writer means next.
  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    onOpenChange(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="ui-confirm-overlay" />
        <DialogContent className="ui-confirm">
          <DialogTitle className="ui-confirm-title">{title}</DialogTitle>
          <form onSubmit={handleSubmit}>
            <Field label={label} htmlFor="ui-prompt-input" className="ui-prompt-field">
              <TextInput
                id="ui-prompt-input"
                type={inputType}
                value={value}
                placeholder={placeholder}
                autoFocus
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
            <div className="ui-confirm-actions">
              <DialogClose asChild>
                <Button severity="secondary">{cancelLabel}</Button>
              </DialogClose>
              <Button type="submit" severity="primary" disabled={value.trim().length === 0}>
                {confirmLabel}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
