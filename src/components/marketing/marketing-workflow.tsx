import { MarketingProductShot } from "@/components/marketing/marketing-product-shot";

type Step = {
  id: string;
  title: string;
  body: string;
  shot: { src: string; alt: string };
  rules?: readonly { term: string; detail: string }[];
};

const STEPS: readonly Step[] = [
  {
    id: "review",
    title: "Review opportunities",
    body: "Website requests land in CRM with their source. Optional FMCSA discovery adds carriers with a priority score that lists every reason it moved. Nobody is contacted until staff review the record.",
    shot: {
      src: "/marketing/product-shots/01-prospecting.png",
      alt: "Prospecting view with carriers, priority scores, and phone-on-file labels",
    },
  },
  {
    id: "voice",
    title: "Qualify by phone",
    body: "Staff start a qualification call from the opportunity. The voice agent asks operational questions, then returns a transcript, a summary, and structured fields.",
    shot: {
      src: "/marketing/product-shots/07-call-summary.png",
      alt: "Call summary with extracted qualification fields waiting for staff review",
    },
    rules: [
      { term: "Consent", detail: "Staff confirm the person agreed to the call. Live numbers must be on an allowlist." },
      { term: "Review", detail: "Fields are a draft until a person accepts or edits them." },
      { term: "Limits", detail: "The agent never marks a deal Won, opens a case, or gives legal advice." },
    ],
  },
  {
    id: "convert",
    title: "Approve service",
    body: "Consultation, approval, and Won happen on the same record as the call. Owner, language, and next action stay with it.",
    shot: {
      src: "/marketing/product-shots/04-crm-consultation.png",
      alt: "Patel Freight Solutions in CRM, ready to schedule a consultation",
    },
  },
  {
    id: "docket",
    title: "Fulfill the case",
    body: "Won work opens a Docket case with a document checklist, tasks, and renewal dates. Uploaded documents are read into fields that staff confirm before any date drives the case.",
    shot: {
      src: "/marketing/product-shots/10-docket-confirm.png",
      alt: "Docket case asking staff to confirm extracted document fields",
    },
  },
  {
    id: "reglens",
    title: "Monitor regulations",
    body: "RegLens pulls Federal Register and FMCSA notices, structures the deadline and required action, and lists clients or prospects who may be affected.",
    shot: {
      src: "/marketing/product-shots/15-reglens-detail-v2.png",
      alt: "RegLens notice matching a current customer as potentially affected",
    },
  },
];

export function MarketingWorkflow() {
  return (
    <section
      id="product"
      className="scroll-mt-24 bg-[var(--mkt-snow)]"
      aria-labelledby="workflow-title"
    >
      <div className="mx-auto max-w-[88rem] px-6 py-20 md:px-8 md:py-28">
        <h2
          id="workflow-title"
          className="max-w-2xl text-[clamp(1.85rem,3.5vw,2.75rem)] text-[var(--mkt-ink)]"
        >
          How it works
        </h2>

        <ol className="mt-14 space-y-20 md:mt-16 md:space-y-28">
          {STEPS.map((step) => (
            <li key={step.id} id={step.id} className="scroll-mt-28">
              <div className="grid gap-6 md:grid-cols-12 md:gap-10">
                <h3 className="text-xl text-[var(--mkt-ink)] md:col-span-4 md:text-2xl">
                  {step.title}
                </h3>
                <div className="md:col-span-7 md:col-start-6">
                  <p className="max-w-[65ch] font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)] md:text-lg">
                    {step.body}
                  </p>
                  {step.rules ? (
                    <dl className="mt-6 divide-y divide-[var(--mkt-border)] border-y border-[var(--mkt-border)]">
                      {step.rules.map((rule) => (
                        <div key={rule.term} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-4">
                          <dt className="font-sans text-sm font-medium text-[var(--mkt-ink)]">
                            {rule.term}
                          </dt>
                          <dd className="font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
                            {rule.detail}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </div>
              <MarketingProductShot
                src={step.shot.src}
                alt={step.shot.alt}
                className="mt-8 md:mt-10"
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
