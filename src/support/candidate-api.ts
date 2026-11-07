/**
 * candidate-api.ts — read-only lookups for the shared .env candidate through the API.
 */
import { EnvConfig } from '../config/env.config';

const API = 'https://api.jobrator.com/api';
const HEADERS = {
  'Content-Type': 'application/json',
  // The API host rejects requests without a browser-like User-Agent.
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
};

async function candidateToken(): Promise<string> {
  const env = EnvConfig.getInstance();
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ email: env.candidateEmail, password: env.candidatePassword, profile: 'Candidate', loginMethod: 'email' })
  });
  if (res.status !== 200) throw new Error(`Candidate API sign-in failed: ${res.status}`);
  return (await res.json()).token;
}

/**
 * IDs of every job the shared candidate has applied to. The job detail page can't be
 * trusted for this: it first renders a static "Apply For Job" link and only switches
 * to "Applied" after its own lookup returns, so a UI check races that switch.
 */
export async function appliedJobIds(): Promise<Set<number>> {
  const token = await candidateToken();
  const res = await fetch(`${API}/account/job-posts/applied/?page=1&limit=1000`, {
    headers: { ...HEADERS, Authorization: `Bearer ${token}` }
  });
  if (res.status !== 200) throw new Error(`Reading the candidate's applied jobs failed: ${res.status}`);
  const body = await res.json();
  return new Set(((body.data ?? []) as Array<{ id: number }>).map((j) => j.id));
}
