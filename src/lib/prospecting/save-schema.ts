import { z } from "zod";

export const discoveredProspectSaveSchema = z.object({
  usdot: z.string().min(1),
  legalName: z.string().min(1),
  dbaName: z.string().nullable().optional(),
  city: z.string(),
  state: z.string(),
  powerUnits: z.number().int().min(0),
  drivers: z.number().int().min(0).optional(),
  addDate: z.string().nullable().optional(),
  mcs150Date: z.string().nullable().optional(),
  carrierOperation: z.string().nullable().optional(),
  classdef: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  officer: z.string().nullable().optional(),
  sourceDataset: z.literal("az4n-8mr2"),
  queriedAt: z.string(),
});
