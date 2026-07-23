import { describe, it, expect } from 'vitest';
import { SHARED_PACKAGE_NAME } from './index.js';

describe('@pvp/shared bootstrap', () => {
  it('exports the placeholder package-name constant', () => {
    expect(SHARED_PACKAGE_NAME).toBe('@pvp/shared');
  });
});
