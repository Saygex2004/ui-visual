// Dialog primitive over `@radix-ui/react-dialog`, replacing
// `primereact/drawer` (Execution Plan Phase 9). Radix's Dialog.Content
// natively sets role="dialog" and auto-wires aria-labelledby to DialogTitle's
// id — but, verified against the installed @radix-ui/react-dialog@1.1.23
// source (no `aria-modal` anywhere in its compiled output), it does **not**
// set `aria-modal` itself, so this wrapper adds it explicitly to keep the
// same guarantee the PrimeReact Drawer's manual override used to provide.
// Focus trap, Esc-close, outside-click-close, and body-scroll-lock are all
// native to Radix Dialog when `modal` (the default) is true.
import * as RadixDialog from '@radix-ui/react-dialog';

export const DialogRoot = RadixDialog.Root;
export const DialogPortal = RadixDialog.Portal;
export const DialogOverlay = RadixDialog.Overlay;
export const DialogTitle = RadixDialog.Title;
export const DialogClose = RadixDialog.Close;

export function DialogContent(props: RadixDialog.DialogContentProps) {
  return <RadixDialog.Content aria-modal="true" {...props} />;
}
