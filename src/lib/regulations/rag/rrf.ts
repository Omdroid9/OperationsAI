/**
 * Reciprocal Rank Fusion (Cormack, Clarke, Buettcher — SIGIR 2009).
 * score(d) = Σ 1 / (k + rank_r(d)), with k = 60 by default.
 * Fuses ranked lists without calibrating incompatible score scales.
 */
export function reciprocalRankFusion(
  rankings: string[][],
  options?: { k?: number },
): Map<string, number> {
  const k = options?.k ?? 60;
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      const rank = index + 1;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    });
  }
  return scores;
}

export function rrfRankedIds(rankings: string[][], options?: { k?: number }): string[] {
  return [...reciprocalRankFusion(rankings, options).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
