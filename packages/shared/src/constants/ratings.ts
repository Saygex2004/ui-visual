// Rating vocabulary (DATA_MODEL.md §10, UI §5). One shared verdict per listing.

export const RATING_VALUES = ['ottimo_affare', 'da_verificare', 'da_evitare'] as const;

export type RatingValue = (typeof RATING_VALUES)[number];
