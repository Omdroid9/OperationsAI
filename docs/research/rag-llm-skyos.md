# Research brief: Advanced RAG & LLM patterns for SkyOS

**Date:** 2026-11-02  
**Question:** Which complex RAG/LLM techniques should SkyOS implement next, given RegLens lexical retrieval already exists and product rules forbid chatbots?  
**Method:** Primary sources (SIGIR RRF paper, Gemini API docs, RAGAS faithfulness docs, vendor hybrid-search docs). Secondary blog posts used only as implementation pointers after the primary claim is established.

---

## Verdict

| Priority | Technique | Practical for SkyOS now? |
| --- | --- | --- |
| **1 — ship** | Hybrid BM25 + dense lexical fusion via **Reciprocal Rank Fusion (k=60)** | **Yes.** Demo-safe, no embedding API. Improves RegLens similar-notice ranking. |
| **2 — ship** | **Citation faithfulness** gate (claims must appear in cited chunk) | **Yes.** Deterministic stand-in for RAGAS faithfulness; blocks unsupported overlap terms. |
| **3 — ship** | **Docket document exemplars** (prior confirmed patterns beside Confirm) | **Yes.** Type-scoped retrieval; keeps human Confirm as the gate. |
| **Next** | Structured Gemini output with required `citation_ids` / null-refusal | Partial — already use JSON mime type; extend schema when live analysis cites corpus. |
| **Later** | Dense provider embeddings + `pgvector` | After product loop is coherent; keep seeded hybrid as fallback. |
| **Avoid** | Chatbot / agentic multi-turn “ask RegLens” | Conflicts with SkyOS UX and claim rules. |

---

## Primary sources used

| Source | URL |
| --- | --- |
| Cormack, Clarke, Buettcher — Reciprocal Rank Fusion (SIGIR 2009 PDF) | https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf |
| Google Research listing of RRF | https://research.google/pubs/reciprocal-rank-fusion-outperforms-condorcet-and-individual-rank-learning-methods/ |
| ACM DL — RRF paper | https://dl.acm.org/doi/10.1145/1571941.1572114 |
| Gemini structured outputs | https://ai.google.dev/gemini-api/docs/generate-content/structured-output |
| Gemini Grounding with Google Search | https://ai.google.dev/gemini-api/docs/generate-content/google-search |
| RAGAS Faithfulness metric | https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/ |
| RAGAS metrics overview (citation accuracy) | https://docs.ragas.io/en/stable/concepts/metrics/overview/ |
| Pinecone hybrid search (RRF client-side fusion) | https://docs.pinecone.io/guides/search/hybrid-search |
| NVIDIA RAG Blueprint hybrid search | https://docs.nvidia.com/rag/latest/hybrid_search.html |
| OpenSearch hybrid search / RRF processor | https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/ |
| Azure AI Search hybrid + RRF | https://learn.microsoft.com/en-us/azure/search/hybrid-search-how-to-query |
| Existing SkyOS FR research | `docs/research/federal-register-reglens.md` |

---

## Technique deep-dives

### 1. Reciprocal Rank Fusion (hybrid retrieval)

Cormack et al. define unsupervised fusion:

\[
\mathrm{score}(d)=\sum_{r\in R}\frac{1}{k+\mathrm{rank}_r(d)}
\]

with **k = 60**. RRF combines ranked lists without calibrating incompatible BM25 vs cosine scores. Vendor docs (Pinecone, OpenSearch, Azure, NVIDIA) adopt the same pattern for BM25/sparse + dense hybrid search.

**SkyOS mapping:** dense = deterministic hashed bag-of-tokens embedding; sparse = in-memory BM25; fuse with RRF; keep domain-tag gate so California BIT does not beat ELD on generic words.

### 2. Faithfulness / citation precision

RAGAS faithfulness = (claims supported by retrieved context) / (total claims). Amazon Bedrock evals separately define citation precision/coverage. For demo survival, SkyOS uses a **rule-based** check: every reported overlap term must tokenize into the cited chunk text (`citationFaithfulness === 1`) before a notice is shown.

### 3. Structured / grounded generation

Gemini structured outputs (`response_mime_type` + JSON schema) already power RegLens analyze and Docket extract. Google’s grounding docs expose `groundingChunks` / `groundingSupports` for Search grounding; forum guidance notes that with structured output, putting **required source fields in the schema** is more reliable than metadata alone.

**SkyOS mapping (next live slice):** extend regulation analysis schema with `supporting_notice_ids: string[] | null` and refuse invented ids; never auto-flag customers from model text.

### 4. Docket document RAG

Confirm remains human. Retrieval shows **prior confirmed patterns** of the same `documentType` so staff compare expiration windows and naming — not auto-verify.

---

## SkyOS implementation plan

| Module | Path | Demo path | Live path |
| --- | --- | --- | --- |
| Hybrid retrieve | `src/lib/regulations/rag/{bm25,rrf,retrieve,faithfulness}.ts` | Seeded corpus only | Same + workspace FR imports; later pgvector dense |
| API | `POST /api/reglens/similar` | Seeded | Same index until vector store |
| UI | RegLens detail similar panel + customer supporting titles | Local repo retrieve | Unchanged |
| Docket | `src/lib/docket/rag/*` + confirm panel | Seeded exemplars | Exemplars from verified case docs |

---

## Explicit non-goals

- Global chat / “Ask SkyOS”
- Uncited legal conclusions or “noncompliant” labels from RAG
- Auto-Won / auto-open Docket from retrieval
- Replacing deterministic carrier-profile matching with LLM-only matching
- Storing raw call transcripts in a shared retrieval index without redaction policy

---

## Evaluation checklist (next slice)

- [ ] New Entrant notice retrieves ELD / HOS / Clearinghouse ahead of unrelated CA BIT
- [ ] Every listed overlap term appears in the cited chunk (`citationFaithfulness = 1`)
- [ ] Flag customers stays disabled until similar notices marked reviewed
- [ ] Docket Confirm shows type-matched prior patterns without changing Confirm semantics
- [ ] Demo mode works with `GEMINI_API_KEY` unset

---

## Implemented in this pass

1. Hybrid BM25 + dense + RRF on RegLens  
2. Citation faithfulness filter  
3. Match-level supporting notice titles  
4. Docket prior confirmed document patterns beside Confirm  
