// Easter-egg dialogs (owner request, 2026-08). Two surprises, both built on
// the shared Radix Dialog primitive (components/Dialog.tsx) so they inherit
// the focus trap / scroll-lock guarantees:
//   • HighValueDialog — intercepts "Vai all'annuncio" on an auction worth
//     more than HIGH_VALUE_THRESHOLD_EUR: a GIF + proceed/dismiss.
//   • NapoliDialog — the L'Aquila-province and Roccaraso-comune gag: a photo
//     and one dialect button. `onlyButton` (Roccaraso) blocks Esc/outside so
//     the button is the single way through.
// All copy arrives via props (the ConfirmDialog convention) so i18n stays at
// the call site.
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from '../../components/Dialog.js';
import { Button } from '../../components/Button.js';
import './eggs.css';

export interface HighValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible dialog name (visually hidden — the GIF carries the visuals). */
  title: string;
  gifSrc: string;
  gifAlt: string;
  proceedLabel: string;
  cancelLabel: string;
  onProceed: () => void;
}

export function HighValueDialog({
  open,
  onOpenChange,
  title,
  gifSrc,
  gifAlt,
  proceedLabel,
  cancelLabel,
  onProceed,
}: HighValueDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="egg-overlay" />
        <DialogContent className="egg-dialog">
          <DialogTitle className="egg-visually-hidden">{title}</DialogTitle>
          <img src={gifSrc} alt={gifAlt} className="egg-media" />
          <div className="egg-actions">
            <Button severity="secondary" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              severity="brand"
              onClick={() => {
                onProceed();
                onOpenChange(false);
              }}
            >
              {proceedLabel}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export interface NapoliDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible dialog name (visually hidden). */
  title: string;
  imgSrc: string;
  imgAlt: string;
  buttonLabel: string;
  /** Roccaraso: the button is the only way out (Esc / outside-click blocked). */
  onlyButton?: boolean;
}

export function NapoliDialog({
  open,
  onOpenChange,
  title,
  imgSrc,
  imgAlt,
  buttonLabel,
  onlyButton = false,
}: NapoliDialogProps) {
  const block = onlyButton ? (event: Event) => event.preventDefault() : undefined;
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="egg-overlay" />
        <DialogContent
          className="egg-dialog egg-dialog-napoli"
          onEscapeKeyDown={block}
          onPointerDownOutside={block}
          onInteractOutside={block}
        >
          <DialogTitle className="egg-visually-hidden">{title}</DialogTitle>
          <img src={imgSrc} alt={imgAlt} className="egg-media egg-media-napoli" />
          <Button
            severity="brand"
            className="egg-napoli-button"
            onClick={() => onOpenChange(false)}
          >
            {buttonLabel}
          </Button>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
