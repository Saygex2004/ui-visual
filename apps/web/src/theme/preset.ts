// PrimeReact theme preset (styled mode).
// Maps PrimeReact's design-token surface onto the project tokens defined in
// tokens.css, so every PrimeReact component inherits the system automatically.
// It references ONLY CSS custom properties from tokens.css — no raw hex here.
// Phase 0 stub: the palette is refined by the Hallmark foundations pass; this
// wiring (semantic → var(--…)) is the contract later phases build with.
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const pvpPreset = definePreset(Aura, {
  semantic: {
    primary: {
      color: 'var(--color-accent)',
      contrastColor: 'var(--color-accent-contrast)',
      hoverColor: 'var(--color-accent-strong)',
      activeColor: 'var(--color-accent-strong)',
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: 'var(--color-focus)',
      offset: '2px',
    },
    colorScheme: {
      light: {
        surface: {
          0: 'var(--color-surface)',
          50: 'var(--color-paper)',
          100: 'var(--color-surface-2)',
          200: 'var(--color-border)',
        },
        text: {
          color: 'var(--color-text)',
          mutedColor: 'var(--color-text-muted)',
        },
        content: {
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        },
      },
    },
  },
});
