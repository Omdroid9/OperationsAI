import localFont from "next/font/local";

/** Primary UI + marketing sans — geometric, readable in dense CRM tables. */
export const nohemi = localFont({
  src: [
    { path: "../../../public/fonts/nohemi-flat/Nohemi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../public/fonts/nohemi-flat/Nohemi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../../public/fonts/nohemi-flat/Nohemi-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../../public/fonts/nohemi-flat/Nohemi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-nohemi",
  display: "swap",
});

export const mangoGrotesque = localFont({
  src: [
    {
      path: "../../../public/fonts/mango-flat/MangoGrotesque-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/mango-flat/MangoGrotesque-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../public/fonts/mango-flat/MangoGrotesque-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../public/fonts/mango-flat/MangoGrotesque-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-mango",
  display: "swap",
});

export const humane = localFont({
  src: [
    { path: "../../../public/fonts/humane/Humane-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../public/fonts/humane/Humane-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../../public/fonts/humane/Humane-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../../public/fonts/humane/Humane-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-humane",
  display: "swap",
});

export const dominique = localFont({
  src: [
    {
      path: "../../../public/fonts/dominique-flat/Dominique-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/dominique-flat/Dominique-RegularItalic.otf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-dominique",
  display: "swap",
});

export type SkyFontChoice = "nohemi" | "mango" | "humane" | "dominique";

export const SKY_FONT_CHOICES: {
  id: SkyFontChoice;
  label: string;
  note: string;
}[] = [
  {
    id: "nohemi",
    label: "Nohemi",
    note: "Sans for body, nav, and CRM workspace.",
  },
  { id: "mango", label: "Mango Grotesque", note: "Characterful grotesque; softer in dense data." },
  { id: "humane", label: "Humane", note: "Condensed voice; narrow for operational UI." },
  {
    id: "dominique",
    label: "Dominique",
    note: "Marketing display serif — paired with Nohemi (live stack).",
  },
];

export const skyFontVariables = [
  nohemi.variable,
  mangoGrotesque.variable,
  humane.variable,
  dominique.variable,
].join(" ");
