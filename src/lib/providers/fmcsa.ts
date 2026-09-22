import { fmcsaWebKey } from "@/lib/providers/status";
import type { CarrierDataProvider, NormalizedFmcsaCarrier } from "@/lib/providers/types";

export type { NormalizedFmcsaCarrier };

const BASE = "https://mobile.fmcsa.dot.gov/qc/services";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickCarrier(payload: unknown): Record<string, unknown> {
  const root = asRecord(payload);
  const content = asRecord(root.content);
  return asRecord(content.carrier ?? root.carrier ?? payload);
}

export function normalizeFmcsaCarrier(payload: unknown): NormalizedFmcsaCarrier {
  const carrier = pickCarrier(payload);
  const operation = asRecord(carrier.carrierOperation);
  const operationDesc = str(operation.carrierOperationDesc) ?? str(carrier.carrierOperation) ?? "";
  const interstate =
    /interstate/i.test(operationDesc) ||
    operationDesc === "A" ||
    operationDesc === "C" ||
    str(carrier.interstate) === "Y";
  const allowed = str(carrier.allowedToOperate) ?? str(carrier.statusCode);
  const addDate = str(carrier.addDate);
  let newEntrant = str(carrier.newEntrant) === "Y" || carrier.newEntrant === true;
  if (!newEntrant && addDate) {
    const added = Date.parse(addDate);
    if (Number.isFinite(added)) {
      const eighteenMonths = 18 * 30 * 24 * 60 * 60 * 1000;
      newEntrant = Date.now() - added < eighteenMonths;
    }
  }

  return {
    usdot: str(carrier.dotNumber) ?? str(carrier.usdot) ?? "",
    legalName: str(carrier.legalName) ?? "Unknown carrier",
    dbaName: str(carrier.dbaName),
    state: (str(carrier.phyState) ?? str(carrier.oicState) ?? "").toUpperCase(),
    city: str(carrier.phyCity) ?? "",
    phone: firstPhone(carrier),
    email: str(carrier.emailAddress) ?? str(carrier.email),
    powerUnits: num(carrier.totalPowerUnits ?? carrier.nbrPowerUnit ?? carrier.powerUnits),
    drivers: num(carrier.totalDrivers ?? carrier.driverTotal ?? carrier.drivers),
    operationType: interstate ? "interstate" : "intrastate",
    authorizedForHire: true,
    newEntrant,
    hazmat: str(carrier.hazmat) === "Y" || Boolean(carrier.isHazmat),
    passenger: Boolean(carrier.isPassenger) || Boolean(carrier.isPassengerCarrier),
    cargoTypes: ["General freight"],
    authorityStatus: allowed === "N" || allowed === "INACTIVE" ? "inactive" : "active",
  };
}

function firstPhone(carrier: Record<string, unknown>): string | null {
  const candidates = [
    carrier.telephone,
    carrier.phone,
    carrier.cellPhone,
    carrier.cellphone,
    carrier.companyPhone,
    carrier.businessPhone,
    carrier.phoneNumber,
  ];
  for (const value of candidates) {
    const text = str(value);
    if (!text) continue;
    const digits = text.replace(/\D/g, "");
    if (digits.length >= 10) return text;
  }
  return null;
}

export const fmcsaCarrierProvider: CarrierDataProvider = {
  async getCarrier(usdot: string) {
    const key = fmcsaWebKey();
    if (!key) {
      throw new Error("FMCSA lookup unavailable. Add FMCSA_WEB_KEY to enable live lookup.");
    }
    const clean = usdot.replace(/\D/g, "");
    const url = `${BASE}/carriers/${clean}?webKey=${encodeURIComponent(key)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`FMCSA lookup unavailable (${response.status}). The latest stored profile can still be used.`);
    }
    const payload: unknown = await response.json();
    const normalized = normalizeFmcsaCarrier(payload);
    if (!normalized.usdot) {
      throw new Error("FMCSA returned no carrier for that USDOT.");
    }

    try {
      const classUrl = `${BASE}/carriers/${clean}/operation-classification?webKey=${encodeURIComponent(key)}`;
      const classRes = await fetch(classUrl, { cache: "no-store" });
      if (classRes.ok) {
        const classPayload: unknown = await classRes.json();
        const text = JSON.stringify(classPayload).toLowerCase();
        normalized.authorizedForHire = text.includes("hire") || text.includes("\"a\"");
      }
    } catch {
      // Keep the default. Classification is optional.
    }

    return normalized;
  },
};

/** Name search returns up to `size` carrier stubs (often without phone until detail lookup). */
export async function searchCarriersByName(name: string, size = 20): Promise<NormalizedFmcsaCarrier[]> {
  const key = fmcsaWebKey();
  if (!key) {
    throw new Error("FMCSA lookup unavailable. Add FMCSA_WEB_KEY to enable live lookup.");
  }
  const q = name.trim();
  if (!q) return [];
  const url = `${BASE}/carriers/name/${encodeURIComponent(q)}?webKey=${encodeURIComponent(key)}&start=1&size=${size}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`FMCSA name search unavailable (${response.status}).`);
  }
  const payload: unknown = await response.json();
  return extractCarrierList(payload).map(normalizeFmcsaCarrier).filter((item) => item.usdot);
}

function extractCarrierList(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  const content = root.content;
  if (Array.isArray(content)) {
    return content.map(asRecord);
  }
  const contentObj = asRecord(content);
  for (const key of ["carrierList", "carriers", "carrier"]) {
    const value = contentObj[key];
    if (Array.isArray(value)) return value.map(asRecord);
    if (value && typeof value === "object") return [asRecord(value)];
  }
  if (root.carrier && typeof root.carrier === "object") {
    return [asRecord(root.carrier)];
  }
  return [];
}
