// Smoke test for the shared Valutazione control (UI §5). The collaborative
// poll path (two users, real server) is covered by
// e2e/ratings-collaboration.spec.ts — this only proves the three
// interactions this component itself owns: setting, clearing via the active
// option, and disabling while a mutation is pending. `./api.js` is mocked so
// no real network call happens.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RatingValue } from '@pvp/shared';
import '../../i18n/index.js';
import { RatingControl } from './RatingControl.js';
import * as ratingsApi from './api.js';

vi.mock('./api.js', () => ({
  fetchRatingsDelta: vi.fn(),
  setRating: vi.fn(),
  clearRating: vi.fn(),
}));

const ratingFixture = {
  value: 'ottimo_affare' as const,
  set_by: 'user-1',
  set_at: '2026-07-02T09:00:00.000Z',
};

function renderControl(value: RatingValue | null) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RatingControl listingId="1001" value={value} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(ratingsApi.setRating).mockReset().mockResolvedValue({ rating: ratingFixture });
  vi.mocked(ratingsApi.clearRating).mockReset().mockResolvedValue(undefined);
});

describe('RatingControl', () => {
  it('marks the active option as pressed and leaves the others unpressed', () => {
    renderControl('da_verificare');
    expect(screen.getByRole('button', { name: 'Ottimo affare' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Da verificare' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Da evitare' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('clicking an inactive option sets that rating', async () => {
    renderControl(null);
    fireEvent.click(screen.getByRole('button', { name: 'Ottimo affare' }));
    await waitFor(() => {
      expect(ratingsApi.setRating).toHaveBeenCalledWith('1001', 'ottimo_affare');
    });
    expect(ratingsApi.clearRating).not.toHaveBeenCalled();
  });

  it('clicking the active option clears the rating', async () => {
    renderControl('ottimo_affare');
    fireEvent.click(screen.getByRole('button', { name: 'Ottimo affare' }));
    await waitFor(() => {
      expect(ratingsApi.clearRating).toHaveBeenCalledWith('1001');
    });
    expect(ratingsApi.setRating).not.toHaveBeenCalled();
  });

  it('disables every option while a mutation is pending', async () => {
    vi.mocked(ratingsApi.setRating).mockReturnValue(new Promise(() => {}));
    renderControl(null);
    fireEvent.click(screen.getByRole('button', { name: 'Ottimo affare' }));
    for (const name of ['Ottimo affare', 'Da verificare', 'Da evitare']) {
      await waitFor(() => {
        expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true);
      });
    }
  });
});
