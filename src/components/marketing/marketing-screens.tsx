import { MarketingProductShot } from "@/components/marketing/marketing-product-shot";

type Shot = {
  src: string;
  alt: string;
  title: string;
  caption: string;
};

type Block =
  | { kind: "full"; shot: Shot }
  | { kind: "pair"; left: Shot; right: Shot };

const BLOCKS: readonly Block[] = [
  {
    kind: "full",
    shot: {
      src: "/marketing/product-shots/18-prospecting-v3.png",
      alt: "Prospecting search of California carriers with priority scores and Save as prospect",
      title: "Census discovery",
      caption: "Carriers from public FMCSA data, scored for review. Nobody is contacted until staff save a prospect.",
    },
  },
  {
    kind: "full",
    shot: {
      src: "/marketing/product-shots/19-crm-v3.png",
      alt: "CRM leads list with Patel Freight and other inbound carriers",
      title: "Inbound leads",
      caption: "Website requests and staff-entered leads on one record — stage, owner, and next action included.",
    },
  },
  {
    kind: "full",
    shot: {
      src: "/marketing/product-shots/20-lead-patel-v3.png",
      alt: "Patel Freight Solutions lead with Schedule consultation as the next action",
      title: "Lead record",
      caption: "Owner, stage, and the next action stay together. Qualification recommended — not a guaranteed conversion.",
    },
  },
  {
    kind: "pair",
    left: {
      src: "/marketing/product-shots/07-call-summary.png",
      alt: "Call summary with extracted qualification fields waiting for staff review",
      title: "Call summary",
      caption: "Extracted fields after qualification. Staff review before the record changes.",
    },
    right: {
      src: "/marketing/product-shots/08-call-transcript.png",
      alt: "Qualification call transcript in English and Hindi",
      title: "Transcript",
      caption: "The conversation that produced those fields.",
    },
  },
  {
    kind: "pair",
    left: {
      src: "/marketing/product-shots/21-call-patel-v3.png",
      alt: "Patel Freight call record with completed status and extracted outcome",
      title: "Call record",
      caption: "Language, interest, and the suggested follow-up on the same page.",
    },
    right: {
      src: "/marketing/product-shots/24-calls-v3.png",
      alt: "Calls list with Patel Freight and Hill Country Freight",
      title: "Calls",
      caption: "What they said, how long, and whether a follow-up is open.",
    },
  },
  {
    kind: "full",
    shot: {
      src: "/marketing/product-shots/22-docket-redwood-v3.png",
      alt: "Docket case for Redwood Linehaul with documents to confirm and missing items",
      title: "Service case",
      caption: "Won work opens a checklist. Staff see what is verified, what needs review, and what is still missing.",
    },
  },
  {
    kind: "pair",
    left: {
      src: "/marketing/product-shots/10-docket-confirm.png",
      alt: "Docket asking staff to confirm extracted CDL and medical certificate fields",
      title: "Confirm fields",
      caption: "Extracted values stay a draft until staff confirm them.",
    },
    right: {
      src: "/marketing/product-shots/11-docket-extracted.png",
      alt: "Extracted document fields with confidence labels and confirm actions",
      title: "Document review",
      caption: "CDL, medical certificate, and other reads with a confidence label.",
    },
  },
  {
    kind: "pair",
    left: {
      src: "/marketing/product-shots/25-docket-list-v3.png",
      alt: "Docket list with Redwood Linehaul in review and Sierra Coast waiting on client",
      title: "Open cases",
      caption: "What is in review and what is waiting on the client.",
    },
    right: {
      src: "/marketing/product-shots/13-reglens-alerts.png",
      alt: "RegLens inbox of fetched FMCSA notices",
      title: "Notice inbox",
      caption: "Fetched FMCSA notices waiting for review. Not a legal opinion.",
    },
  },
  {
    kind: "full",
    shot: {
      src: "/marketing/product-shots/23-reglens-detail-v3.png",
      alt: "RegLens notice matching Sierra Coast Hauling as potentially affected",
      title: "Regulation match",
      caption: "Clients whose operating profile may overlap. Review recommended — not a finding.",
    },
  },
];

export function MarketingScreens() {
  return (
    <section
      id="product"
      className="scroll-mt-24 bg-[var(--mkt-canvas)]"
      aria-labelledby="product-title"
    >
      <div className="mx-auto max-w-[88rem] px-6 py-16 md:px-8 md:py-24">
        <h2
          id="product-title"
          className="text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.15] text-[var(--mkt-ink)]"
        >
          The product
        </h2>
        <p className="mt-3 max-w-[60ch] font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
          Captured from the seeded workspace. Same records you open after access.
        </p>

        <div className="mt-12 space-y-14 md:mt-16 md:space-y-20">
          {BLOCKS.map((block, index) =>
            block.kind === "full" ? (
              <MarketingProductShot
                key={block.shot.src}
                src={block.shot.src}
                alt={block.shot.alt}
                title={block.shot.title}
                caption={block.shot.caption}
                priority={index === 0}
              />
            ) : (
              <div
                key={block.left.src}
                className="grid gap-6 md:grid-cols-2 md:gap-8"
              >
                <MarketingProductShot
                  src={block.left.src}
                  alt={block.left.alt}
                  title={block.left.title}
                  caption={block.left.caption}
                  aspectClassName="aspect-[16/10]"
                  sizes="(max-width: 768px) 100vw, 44rem"
                />
                <MarketingProductShot
                  src={block.right.src}
                  alt={block.right.alt}
                  title={block.right.title}
                  caption={block.right.caption}
                  aspectClassName="aspect-[16/10]"
                  sizes="(max-width: 768px) 100vw, 44rem"
                />
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
