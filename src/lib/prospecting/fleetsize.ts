/** FMCSA Census fleetsize codes covering roughly 1–20 power units. */
export const ELIGIBLE_FLEETSIZE_CODES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export function eligibleFleetsizeSoql(): string {
  return ELIGIBLE_FLEETSIZE_CODES.map((code) => `'${code}'`).join(", ");
}
