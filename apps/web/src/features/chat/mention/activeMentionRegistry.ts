// Bridges the chat mention picker (deep inside RichTextEditor, itself deep
// inside the workspace drawer's Chat tab) to WorkspacePanel's Dialog, which
// has no other way to know a mention popup is open right now.
//
// Why this exists: Radix's Dialog closes on Escape via `DismissableLayer`,
// which attaches its own keydown listener on `document` in the CAPTURE
// phase at the moment the drawer mounts — before anything inside its
// content, including ProseMirror's own keydown handling, ever sees the
// event. `event.stopPropagation()` from inside the mention extension's own
// keydown handler (mentionExtension.ts) is therefore always too late: Esc
// dismissing the mention popup was also closing the entire drawer (found
// live, Phase 11 hardening). Calling `event.preventDefault()` from Dialog's
// own `onEscapeKeyDown` prop does stop the drawer — Radix respects it — but
// ProseMirror treats an already-`defaultPrevented` event as "handled
// elsewhere" and skips its own Escape handling too, so the popup then never
// closed either.
//
// The fix: WorkspacePanel's `onEscapeKeyDown` calls `closeActiveMention()`
// directly and, only if it actually closed something, calls
// `preventDefault()` itself — closing the popup and keeping the drawer open
// are both driven from the exact same event handler, so there is no
// propagation race to lose.
let activeCloser: (() => void) | null = null;

export function registerMentionCloser(closeFn: (() => void) | null): void {
  activeCloser = closeFn;
}

/** Returns true if a mention popup was open and has now been closed. */
export function closeActiveMention(): boolean {
  if (!activeCloser) return false;
  activeCloser();
  return true;
}
