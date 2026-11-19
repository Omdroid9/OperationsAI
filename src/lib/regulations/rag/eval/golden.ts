/**
 * Golden set for RegLens similar-notice retrieval.
 *
 * `keyword` cases use the vocabulary staff and FMCSA notices share.
 * `paraphrase` cases describe the same topic without that vocabulary; a
 * lexical index is expected to miss them, which is the measured case for
 * real embeddings. Relevance labels are hand-assigned against the seeded
 * corpus in `../corpus.ts` — update both together.
 */
export type GoldenCase = {
  id: string;
  kind: "keyword" | "paraphrase";
  query: string;
  relevant: string[];
  /** Notices that must not be returned for this query. */
  forbidden?: string[];
};

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: "k-new-entrant",
    kind: "keyword",
    query:
      "New Entrant safety assurance packet: ELD and hours of service recordkeeping for interstate carriers",
    relevant: [
      "corpus_new-entrant-packet",
      "corpus_eld-mandate-refresh",
      "corpus_small-fleet-hos",
    ],
    forbidden: ["corpus_ca-bit-inspection", "corpus_hazmat-security"],
  },
  {
    id: "k-ifta-irp",
    kind: "keyword",
    query: "IFTA fuel tax and IRP registration renewal dates for interstate carriers",
    relevant: ["corpus_ifta-irp-renewal"],
    forbidden: ["corpus_ca-bit-inspection"],
  },
  {
    id: "k-clearinghouse",
    kind: "keyword",
    query: "Clearinghouse query required before a CDL driver is dispatched",
    relevant: ["corpus_drug-alcohol-clearinghouse"],
  },
  {
    id: "k-ca-bit",
    kind: "keyword",
    query: "California BIT terminal inspection and maintenance file readiness",
    relevant: ["corpus_ca-bit-inspection"],
    forbidden: ["corpus_ifta-irp-renewal"],
  },
  {
    id: "k-authority",
    kind: "keyword",
    query: "for-hire authority financial responsibility filing lapsed",
    relevant: ["corpus_ucs-filing"],
  },
  {
    id: "k-small-fleet",
    kind: "keyword",
    query: "small fleet hours of service logs and supporting documents",
    relevant: ["corpus_small-fleet-hos", "corpus_eld-mandate-refresh"],
    forbidden: ["corpus_hazmat-security"],
  },
  {
    id: "k-hazmat",
    kind: "keyword",
    query: "hazmat security plan and employee training for placarded loads",
    relevant: ["corpus_hazmat-security"],
  },
  {
    id: "p-eld",
    kind: "paraphrase",
    query: "in-cab hardware that replaces paper logbooks for tracking driver duty time",
    relevant: ["corpus_eld-mandate-refresh", "corpus_small-fleet-hos"],
  },
  {
    id: "p-authority",
    kind: "paraphrase",
    query: "proof of liability insurance expired so operating permission was suspended",
    relevant: ["corpus_ucs-filing"],
  },
  {
    id: "p-clearinghouse",
    kind: "paraphrase",
    query: "check the substance testing database before hiring a trucker",
    relevant: ["corpus_drug-alcohol-clearinghouse"],
  },
  {
    id: "p-ifta-irp",
    kind: "paraphrase",
    query: "quarterly fuel tax decals and apportioned plates are about to expire",
    relevant: ["corpus_ifta-irp-renewal"],
  },
  {
    id: "p-new-entrant",
    kind: "paraphrase",
    query: "recently registered trucking company facing its first safety audit",
    relevant: ["corpus_new-entrant-packet"],
  },
];
