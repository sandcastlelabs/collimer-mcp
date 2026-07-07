// Core scan logic — wraps the Collimer public free-scan REST API.
// Kept separate from the MCP wiring so it can be unit/smoke-tested directly.

export const API_BASE = process.env.COLLIMER_API_BASE ?? "https://app.collimer.com";
export const SOURCE = process.env.COLLIMER_SCAN_SOURCE ?? "mcp";
export const USER_AGENT = "collimer-mcp/0.2.0";

/** Parse a positive-number env override, falling back when missing/invalid (#7). */
function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MAX_POLLS = num(process.env.COLLIMER_MAX_POLLS, 60);
const POLL_INTERVAL_MS = num(process.env.COLLIMER_POLL_INTERVAL_MS, 5000);
const REQUEST_TIMEOUT_MS = num(process.env.COLLIMER_REQUEST_TIMEOUT_MS, 30000);
const MAX_RETRY_AFTER_MS = 60000;
const MAX_CREATE_ATTEMPTS = 3;

export interface Teaser {
  scan_token: string;
  status: string;
  url?: string;
  brand?: string;
  score?: number;
  confidence_interval?: { lower: number; upper: number; plus_minus: number } | null;
  top_gap?: { title?: string; impact?: unknown } | null;
  report_url?: string;
  cta_url?: string;
  cta_text?: string;
  full_report?: { locked?: boolean; recommendations_total?: number; unlock_url?: string };
}

export class ScanError extends Error {
  detail?: unknown;
  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = "ScanError";
    this.detail = detail;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Normalize a bare domain ("example.com") into an https URL, and reject anything
 * that isn't http(s) (#5) — no javascript:/file:/data: reaching the network.
 */
export function normalizeUrl(domain: string): string {
  const raw = domain.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new ScanError(`Not a valid domain or URL: "${domain}".`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ScanError(`Unsupported URL scheme "${parsed.protocol}" — use http(s).`);
  }
  return parsed.toString();
}

/** fetch with a per-request timeout, composed with any caller deadline (#2). */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  outer?: AbortSignal,
): Promise<Response> {
  const signals: AbortSignal[] = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (outer) signals.push(outer);
  try {
    return await fetch(url, { ...init, signal: AbortSignal.any(signals) });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ScanError(`Request to ${url} timed out.`);
    }
    throw new ScanError(`Network error contacting ${url}: ${String(err)}`);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/** Retry-After (seconds) → bounded ms; falls back to the poll interval (#3). */
function retryAfterMs(res: Response): number {
  const header = res.headers.get("retry-after");
  const secs = header ? Number(header) : NaN;
  const ms = Number.isFinite(secs) && secs > 0 ? secs * 1000 : POLL_INTERVAL_MS;
  return Math.min(ms, MAX_RETRY_AFTER_MS);
}

/**
 * Run a Collimer free scan and return the depth-gated teaser. Never returns the
 * full report — that is gated behind a free web account (see `cta_url`).
 */
export async function runScan(
  domain: string,
  email?: string,
  signal?: AbortSignal,
): Promise<Teaser> {
  if (!domain || !domain.trim()) throw new ScanError("A domain or URL is required.");

  const url = normalizeUrl(domain);
  const body: Record<string, unknown> = { url, source: SOURCE };
  if (email) body.email = email;
  const headers = { "content-type": "application/json", "user-agent": USER_AGENT };

  // 1) Create — retry on 429 (honouring Retry-After) up to a few attempts.
  let token: string | undefined;
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const res = await fetchWithTimeout(
      `${API_BASE}/api/v1/scan`,
      { method: "POST", headers, body: JSON.stringify(body) },
      signal,
    );
    if (res.status === 429) {
      await sleep(retryAfterMs(res));
      continue;
    }
    if (res.status !== 201 && res.status !== 200) {
      throw new ScanError(`Scan could not be started (HTTP ${res.status}).`, await safeJson(res));
    }
    const created = (await safeJson(res)) as { scan_token?: string } | undefined;
    token = created?.scan_token;
    break;
  }
  if (!token) {
    throw new ScanError("Could not start the scan (it may be rate-limited — try again shortly).");
  }

  // 2) Poll until complete.
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetchWithTimeout(
      `${API_BASE}/api/v1/scan/${encodeURIComponent(token)}`,
      { headers: { "user-agent": USER_AGENT } },
      signal,
    );
    if (res.status === 200) {
      const teaser = await safeJson(res);
      if (!teaser || typeof teaser !== "object") {
        throw new ScanError("Scan completed but returned an unreadable response.");
      }
      return teaser as Teaser;
    }
    if (res.status === 404) throw new ScanError("Scan token not found.");
    if (res.status === 429) {
      await sleep(retryAfterMs(res));
      continue;
    }
    if (res.status !== 202) {
      throw new ScanError(`Polling failed (HTTP ${res.status}).`, await safeJson(res));
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new ScanError("Timed out waiting for the scan to complete.");
}

/** Render the teaser as a concise, assistant-friendly summary. */
export function formatTeaser(t: Teaser): string {
  const score = typeof t.score === "number" ? `${t.score}/100` : "n/a";
  const ci = t.confidence_interval ? ` (±${t.confidence_interval.plus_minus})` : "";
  const brand = t.brand ?? t.url ?? "the site";
  const lines = [`AI-search visibility for ${brand}: ${score}${ci}.`];

  if (t.top_gap?.title) lines.push(`Biggest gap: ${t.top_gap.title}.`);
  if (t.report_url) lines.push(`Full scorecard: ${t.report_url}`);

  const total = t.full_report?.recommendations_total;
  const unlock = t.cta_url ?? t.full_report?.unlock_url;
  if (unlock) {
    const n = typeof total === "number" ? `${total} recommendations + ` : "";
    lines.push(`Unlock the full report (${n}share of voice across each AI engine) with a free account: ${unlock}`);
  }
  lines.push("Tip: after you make changes, re-run the scan to measure the delta.");
  return lines.join("\n");
}
