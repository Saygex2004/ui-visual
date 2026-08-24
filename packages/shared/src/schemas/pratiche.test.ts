// The create/patch split for `pratiche`. These run without an emulator, so a
// regression here fails in seconds instead of in an integration run — and the
// regression they guard against is data loss, not a wrong shape.
import { describe, expect, it } from 'vitest';
import { PraticaInputSchema, PraticaPatchSchema, STATI_PRATICA } from './partB/pratiche.js';

const MINIMO = { ndg: '900123', numero_pratica: '163354' };

describe('PraticaInputSchema (creation)', () => {
  it('fills the documented defaults for everything not supplied', () => {
    const p = PraticaInputSchema.parse(MINIMO);
    expect(p.stato).toBe('richiesto'); // a file exists because it was asked for
    expect(p.estinto).toBe(false);
    expect(p.portafoglio).toBeNull();
    expect(p.data_spedizione).toBeNull();
    expect(p.costo_spedizione_cent).toBeNull();
  });

  it('turns a blank optional string into null, not ""', () => {
    const p = PraticaInputSchema.parse({ ...MINIMO, portafoglio: '   ', note: '' });
    expect(p.portafoglio).toBeNull();
    expect(p.note).toBeNull();
  });

  it('refuses a blank NDG, an unknown stage, a fractional or negative cost', () => {
    expect(PraticaInputSchema.safeParse({ ...MINIMO, ndg: '  ' }).success).toBe(false);
    expect(PraticaInputSchema.safeParse({ ...MINIMO, stato: 'smarrito' }).success).toBe(false);
    // Cents are whole by definition.
    expect(PraticaInputSchema.safeParse({ ...MINIMO, costo_spedizione_cent: 12.5 }).success).toBe(
      false,
    );
    expect(PraticaInputSchema.safeParse({ ...MINIMO, costo_spedizione_cent: -1 }).success).toBe(
      false,
    );
  });

  it('refuses a date that is not YYYY-MM-DD', () => {
    expect(PraticaInputSchema.safeParse({ ...MINIMO, data_spedizione: '21/08/2026' }).success).toBe(
      false,
    );
    expect(PraticaInputSchema.safeParse({ ...MINIMO, data_spedizione: '2026-08-21' }).success).toBe(
      true,
    );
  });

  it('accepts every declared stage', () => {
    for (const stato of STATI_PRATICA) {
      expect(PraticaInputSchema.parse({ ...MINIMO, stato }).stato).toBe(stato);
    }
  });
});

describe('PraticaPatchSchema', () => {
  it('mentions ONLY the keys it was given', () => {
    // The bug this pins: the patch schema used to be derived from the input
    // schema, whose fields carry `.default(null)`. `.partial()` cannot remove
    // a default, so an absent key came back as null and "change the stage"
    // became "change the stage and erase every date, the portfolio, the boxes,
    // the notes and the cost" (2026-08-24).
    const patch = PraticaPatchSchema.parse({ stato: 'consegnato' });
    expect(Object.keys(patch)).toEqual(['stato']);
  });

  it('leaves an untouched field absent even when other fields are sent', () => {
    const patch = PraticaPatchSchema.parse({
      estinto: true,
      data_consegna_effettiva: '2026-08-24',
    });
    expect(Object.keys(patch).sort()).toEqual(['data_consegna_effettiva', 'estinto']);
    expect('data_spedizione' in patch).toBe(false);
  });

  it('still lets a field be cleared on purpose, by sending null explicitly', () => {
    // "Not mentioned" and "set to nothing" must remain different instructions.
    const patch = PraticaPatchSchema.parse({ data_spedizione: null });
    expect(patch.data_spedizione).toBeNull();
    expect('data_spedizione' in patch).toBe(true);
  });

  it('accepts an empty patch without inventing content', () => {
    expect(Object.keys(PraticaPatchSchema.parse({}))).toEqual([]);
  });

  it('still validates the values it is given', () => {
    expect(PraticaPatchSchema.safeParse({ stato: 'smarrito' }).success).toBe(false);
    expect(PraticaPatchSchema.safeParse({ ndg: '  ' }).success).toBe(false);
  });
});
