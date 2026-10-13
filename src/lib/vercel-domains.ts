import { z } from "zod";

const API = "https://api.vercel.com";

type Credentials = { token: string; projectId: string; teamId: string | null };

function credentials(): Credentials | null {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID || null };
}

export function domainsConfigured(): boolean {
  return credentials() !== null;
}

async function call(creds: Credentials, method: string, path: string, body?: unknown) {
  const url = new URL(path, API);
  if (creds.teamId) url.searchParams.set("teamId", creds.teamId);
  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
}

const vercelError = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

async function failure(response: Response): Promise<string> {
  const parsed = vercelError.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error.message : `Vercel returned ${response.status}`;
}

export type DomainResult = { ok: true } | { ok: false; reason: string };

/** Attaches the hostname to the Harbor project. `created` is false when it was already attached. */
export async function addProjectDomain(name: string): Promise<{ ok: true; created: boolean } | { ok: false; reason: string }> {
  const creds = credentials();
  if (!creds) return { ok: false, reason: "Custom domains aren't connected for this deployment." };
  const response = await call(creds, "POST", `/v10/projects/${encodeURIComponent(creds.projectId)}/domains`, { name });
  if (response.ok) return { ok: true, created: true };
  const parsed = vercelError.safeParse(await response.clone().json().catch(() => null));
  if (parsed.success && parsed.data.error.code === "domain_already_in_use") return { ok: false, reason: "That domain is already used by another Vercel project." };
  if (response.status === 409) return { ok: true, created: false };
  return { ok: false, reason: await failure(response) };
}

export async function removeProjectDomain(name: string): Promise<DomainResult> {
  const creds = credentials();
  if (!creds) return { ok: true };
  const response = await call(creds, "DELETE", `/v9/projects/${encodeURIComponent(creds.projectId)}/domains/${encodeURIComponent(name)}`);
  if (response.ok || response.status === 404) return { ok: true };
  return { ok: false, reason: await failure(response) };
}

const projectDomain = z.object({
  verified: z.boolean(),
  verification: z.array(z.object({ type: z.string(), domain: z.string(), value: z.string() })).optional(),
});
const domainConfig = z.object({
  misconfigured: z.boolean(),
  recommendedCNAME: z.array(z.object({ rank: z.number(), value: z.string() })).optional(),
});

export type DnsRecord = { type: string; name: string; value: string };
export type DomainStatus =
  | { state: "not_configured" }
  | { state: "error"; reason: string }
  | { state: "pending"; records: DnsRecord[] }
  | { state: "active" };

/** Live status from Vercel; never cached, because DNS changes outside Harbor. */
export async function domainStatus(name: string): Promise<DomainStatus> {
  const creds = credentials();
  if (!creds) return { state: "not_configured" };
  const [domainResponse, configResponse] = await Promise.all([
    call(creds, "GET", `/v9/projects/${encodeURIComponent(creds.projectId)}/domains/${encodeURIComponent(name)}`),
    call(creds, "GET", `/v6/domains/${encodeURIComponent(name)}/config`),
  ]);
  if (!domainResponse.ok) return { state: "error", reason: await failure(domainResponse) };
  if (!configResponse.ok) return { state: "error", reason: await failure(configResponse) };
  const domain = projectDomain.safeParse(await domainResponse.json());
  const config = domainConfig.safeParse(await configResponse.json());
  if (!domain.success || !config.success) return { state: "error", reason: "Vercel returned an unexpected response." };

  if (domain.data.verified && !config.data.misconfigured) return { state: "active" };
  const cname = [...(config.data.recommendedCNAME ?? [])].sort((a, b) => a.rank - b.rank)[0]?.value ?? "cname.vercel-dns.com";
  const records: DnsRecord[] = [{ type: "CNAME", name, value: cname.replace(/\.$/, "") }];
  for (const challenge of domain.data.verification ?? []) records.push({ type: challenge.type, name: challenge.domain, value: challenge.value });
  return { state: "pending", records };
}
