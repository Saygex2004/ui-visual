// The create/patch split for `carta_azienda`, and the one field whose default
// would have done real damage if it leaked into a patch.
import { describe, expect, it } from 'vitest';
import { CartaAziendaInputSchema, CartaAziendaPatchSchema } from './partB/cartaAzienda.js';

const MINIMO = { nome: 'Nuova Azienda S.r.l.' };

describe('CartaAziendaInputSchema (creation)', () => {
  it('needs only a name, and fills the documented defaults', () => {
    const a = CartaAziendaInputSchema.parse(MINIMO);
    expect(a.usabile_come_mittente).toBe(true); // most are added to write from
    expect(a.stampa_nome_intestazione).toBe(true); // …and to be recognisable
    expect(a.logo).toBeNull();
    expect(a.via).toBeNull();
  });

  it('refuses a nameless company', () => {
    expect(CartaAziendaInputSchema.safeParse({ nome: '  ' }).success).toBe(false);
  });

  it('turns a blank optional string into null, not ""', () => {
    const a = CartaAziendaInputSchema.parse({ ...MINIMO, via: '   ', pec: '' });
    expect(a.via).toBeNull();
    expect(a.pec).toBeNull();
  });

  it('refuses a logo that is not an image, and a colour that is not a colour', () => {
    // The logo string goes straight into an <img src> and into the generated
    // document; anything that is not an image must not get in.
    for (const logo of [
      'data:text/html;base64,PHNjcmlwdD4=',
      'https://altrove.test/logo.png',
      'javascript:alert(1)',
    ]) {
      expect(CartaAziendaInputSchema.safeParse({ ...MINIMO, logo }).success).toBe(false);
    }
    expect(CartaAziendaInputSchema.safeParse({ ...MINIMO, header_color: 'blu' }).success).toBe(
      false,
    );
  });
});

describe('CartaAziendaPatchSchema', () => {
  it('carries only what was sent — no default may ride along', () => {
    // The trap this schema is shaped to avoid: built from the INPUT schema,
    // `.partial()` would not remove the defaults, so editing the city would
    // quietly switch the printed name and the sender flag back on.
    const patch = CartaAziendaPatchSchema.parse({ citta: 'Roma' });
    expect(patch).toEqual({ citta: 'Roma' });
    expect('stampa_nome_intestazione' in patch).toBe(false);
    expect('usabile_come_mittente' in patch).toBe(false);
    expect('logo' in patch).toBe(false);
  });

  it('can switch the printed name off, explicitly', () => {
    expect(CartaAziendaPatchSchema.parse({ stampa_nome_intestazione: false })).toEqual({
      stampa_nome_intestazione: false,
    });
  });
});
