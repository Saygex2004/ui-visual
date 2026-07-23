// Easter-egg constants (UI Appendix B). Behaviour lives in the UI (Phase 9);
// the thresholds/identifiers are shared constants so they are defined once.

/** Opening a listing whose base value STRICTLY exceeds this shows the
 *  high-value confirmation dialog (UI Appendix B). Euro. */
export const HIGH_VALUE_THRESHOLD_EUR = 5_000_000;

/** Selecting this PROVINCE in the drill-down triggers the themed dialog. */
export const EASTER_EGG_PROVINCE = "L'Aquila";

/** Opening a listing in this COMUNE triggers the same dialog (single action
 *  both dismisses and opens the listing). */
export const EASTER_EGG_COMUNE = 'Roccaraso';
