import { describe, it, expect } from 'vitest';
import { resources, NAMESPACES } from './index.js';

describe('i18n catalog', () => {
  it('ships an `it` locale for every declared namespace', () => {
    for (const ns of NAMESPACES) {
      expect(resources.it).toHaveProperty(ns);
    }
  });

  it('renders the bootstrap proof string from common.json', () => {
    expect(resources.it.common.bootstrap.proof).toBe('Ambiente inizializzato correttamente.');
  });
});
