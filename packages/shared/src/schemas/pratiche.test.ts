// The create/patch split for `pratiche`. These run without an emulator, so a
// regression here fails in seconds instead of in an integration run — and the
// regression they guard against is data loss, not a wrong shape.
import { describe, expect, it } from 'vitest';
import { PraticaInputSchema, PraticaPatchSchema, STATI_PRATICA } from './partB/pratiche.js';

const MINIMO = { ndg: ['900123'], numero_pratica: '163354' };

describe('PraticaInputSchema (creation)', () => {
  it('fills the documented defaults for everything not supplied', () => {
    const p = PraticaInputSchema.parse(MINIMO);
    expect(p.stato).toBe('richiesto'); // a file exists because it was asked for
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
    expect(PraticaInputSchema.safeParse({ ...MINIMO, ndg: ['  '] }).success).toBe(false);
    expect(PraticaInputSchema.safeParse({ ...MINIMO, ndg: [] }).success).toBe(false);
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
      portafoglio: 'Augusto',
      data_consegna_effettiva: '2026-08-24',
    });
    expect(Object.keys(patch).sort()).toEqual(['data_consegna_effettiva', 'portafoglio']);
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

describe('ndg — one order can cover several positions', () => {
  it('keeps every NDG, in the order given', () => {
    const p = PraticaInputSchema.parse({ ...MINIMO, ndg: ['900123', '111222', '333444'] });
    expect(p.ndg).toEqual(['900123', '111222', '333444']);
  });

  it('accepts a bare string and normalises it to a one-element list', () => {
    // The records written before this became a list carry one. Refusing them
    // would make the whole register unreadable rather than migrating it.
    const p = PraticaInputSchema.parse({ ...MINIMO, ndg: '229613-030529' });
    expect(p.ndg).toEqual(['229613-030529']);
  });

  it('refuses a list with a blank entry rather than storing an empty NDG', () => {
    expect(PraticaInputSchema.safeParse({ ...MINIMO, ndg: ['900123', ''] }).success).toBe(false);
  });

  it('patching the NDGs replaces the list, and touches nothing else', () => {
    const patch = PraticaPatchSchema.parse({ ndg: ['A', 'B'] });
    expect(patch.ndg).toEqual(['A', 'B']);
    expect('data_spedizione' in patch).toBe(false);
    expect('slack_tag_user_ids' in patch).toBe(false);
  });
});

describe('slack_tag_user_ids — who gets mentioned', () => {
  it('defaults to an empty list, meaning the installation-wide mention', () => {
    // A record that names nobody must keep behaving exactly as it did before
    // the field existed.
    expect(PraticaInputSchema.parse(MINIMO).slack_tag_user_ids).toEqual([]);
  });

  it('carries ACCOUNT ids, not Slack ids, and keeps several', () => {
    // Resolved to Slack member ids at send time: a person whose Slack account
    // is recreated gets a new member id, and every pratica should follow them
    // without being rewritten.
    const p = PraticaInputSchema.parse({
      ...MINIMO,
      slack_tag_user_ids: ['user-7', 'user-9'],
    });
    expect(p.slack_tag_user_ids).toEqual(['user-7', 'user-9']);
  });

  it('accepts the single-choice shape this field briefly had', () => {
    expect(
      PraticaInputSchema.parse({ ...MINIMO, slack_tag_user_ids: 'user-7' }).slack_tag_user_ids,
    ).toEqual(['user-7']);
    expect(
      PraticaInputSchema.parse({ ...MINIMO, slack_tag_user_ids: null }).slack_tag_user_ids,
    ).toEqual([]);
  });

  it('collapses a repeated person: mentioning them twice is noise', () => {
    const p = PraticaInputSchema.parse({
      ...MINIMO,
      slack_tag_user_ids: ['user-7', 'user-7', ' user-9 '],
    });
    expect(p.slack_tag_user_ids).toEqual(['user-7', 'user-9']);
  });
});
