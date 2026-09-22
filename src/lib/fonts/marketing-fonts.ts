import { Figtree, Schibsted_Grotesk } from "next/font/google";

/** Display — Schibsted news grotesque. Distinct from workspace Geist. */
export const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-schibsted",
  display: "swap",
});

/** UI / body sans. */
export const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const marketingFontVariables = `${schibsted.variable} ${figtree.variable}`;
