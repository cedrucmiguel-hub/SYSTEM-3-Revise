import { apiUrl } from "./api";

const configuredTimeout = Number(process.env.POINTS_SERVICE_TIMEOUT_MS || 900);
const DEFAULT_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 900;

function fullUrl(path: string) {
  return apiUrl(path);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const res = await fetch(fullUrl(path), {
    ...init,
    signal: controller.signal,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  }).finally(() => clearTimeout(timeout));
  if (!res.ok) {
    const raw = await res.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw || "{}") as { error?: unknown; message?: unknown };
      message = String(parsed.error || parsed.message || raw);
    } catch {
    }
    throw new Error(message || `Points service error (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function awardPoints(payload: any, idempotencyKey?: string) {
  return call<{ ok: boolean; result: any }>("/points/award", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
}

export async function redeemPoints(payload: any, idempotencyKey?: string) {
  return call<{ ok: boolean; result: any }>("/points/redeem", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
}

export async function fetchTiers() {
  return call<{ ok: boolean; tiers: any[] }>("/tiers", { method: "GET" });
}

export async function runExpiry() {
  return call<{ ok: boolean; result: any }>("/points/expiry/run", { method: "POST" });
}

export const awardPointsViaService = awardPoints;
export const redeemPointsViaService = redeemPoints;
export const fetchTierRulesViaService = fetchTiers;
export const runExpiryViaService = runExpiry;
