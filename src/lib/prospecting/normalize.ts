import { z } from "zod";

export const censusRowSchema = z.object({
  dot_number: z.union([z.string(), z.number()]).transform(String),
  legal_name: z.string().optional().nullable(),
  dba_name: z.string().optional().nullable(),
  phy_city: z.string().optional().nullable(),
  phy_state: z.string().optional().nullable(),
  status_code: z.string().optional().nullable(),
  power_units: z.union([z.string(), z.number()]).optional().nullable(),
  fleetsize: z.string().optional().nullable(),
  add_date: z.string().optional().nullable(),
  mcs150_date: z.string().optional().nullable(),
  carrier_operation: z.string().optional().nullable(),
  classdef: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email_address: z.string().optional().nullable(),
  company_officer_1: z.string().optional().nullable(),
  total_drivers: z.union([z.string(), z.number()]).optional().nullable(),
});

export type CensusRow = z.infer<typeof censusRowSchema>;

export function parsePowerUnits(value: string | number | null | undefined): number {
  const parsed = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDrivers(value: string | number | null | undefined): number {
  const parsed = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const text = value?.trim().toLowerCase() ?? "";
  if (!text || !text.includes("@")) return null;
  return text;
}

export function isAuthorizedForHire(classdef: string | null | undefined): boolean {
  return (classdef ?? "").toUpperCase().includes("AUTHORIZED FOR HIRE");
}

export function isInterstateOperation(carrierOperation: string | null | undefined): boolean {
  return (carrierOperation ?? "").toUpperCase() === "A";
}
