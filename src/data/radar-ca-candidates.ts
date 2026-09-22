/**
 * Seed USDOT candidates for CA New Entrant radar.
 * FMCSA QCMobile has no "list by state" endpoint — radar probes candidates
 * via name search + these known dots, then keeps CA matches after live detail lookup.
 */
export const CA_RADAR_NAME_QUERIES = [
  "california freight",
  "california trucking",
  "los angeles transport",
  "fresno logistics",
  "stockton trucking",
] as const;

/** Prefer detail-refreshing these after name search (optional extras). */
export const CA_RADAR_SEED_USDOTS = [
  "738573",
  "580606",
  "2138244",
  "1000282",
] as const;
