/**
 * throwaway-accounts.ts — registers a fresh, never-shared account through the API.
 *
 * Why: the login API locks an email out with 429 after 5 consecutive failed
 * attempts (ADO-29637), for several minutes. Every scenario that submits a bad
 * password for the shared .env candidate or employer adds to that count, and once
 * it trips, every scenario that signs in as that account fails until it expires.
 * Negative login scenarios only need *a registered account* to be meaningful, so
 * they get one of their own and the shared accounts never see a bad password.
 *
 * Both kinds sign in with the same generic 401 for a wrong password as a fully
 * active account, so they are faithful stand-ins. A new company stays "pending
 * approval" (its CORRECT password answers 403 COMPANY_APPROVAL_PENDING), so only
 * use a throwaway employer for scenarios that expect sign-in to fail.
 */

const API = 'https://api.jobrator.com/api';
const HEADERS = {
  'Content-Type': 'application/json',
  // The API host rejects requests without a browser-like User-Agent.
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
};

export interface ThrowawayAccount {
  email: string;
  /** Mixed case on purpose: the "wrong-case password" scenarios lower-case it. */
  password: string;
}

function uniqueEmail(kind: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `isolated-${kind}-${stamp}${rand}@mailinator.com`;
}

async function register(path: string, body: Record<string, string>): Promise<void> {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  if (res.status !== 201) {
    const text = await res.text().catch(() => '');
    throw new Error(`Registering a throwaway account via ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
}

export async function registerThrowawayCandidate(): Promise<ThrowawayAccount> {
  const account = { email: uniqueEmail('candidate'), password: 'Isolated#Login2026' };
  await register('/register-candidate', {
    firstName: 'Isolated',
    lastName: 'Login',
    email: account.email,
    password: account.password,
    loginMethod: 'email'
  });
  return account;
}

export async function registerThrowawayEmployer(): Promise<ThrowawayAccount> {
  const account = { email: uniqueEmail('employer'), password: 'Isolated#Login2026' };
  await register('/register-company', {
    name: `Isolated Login Co ${Date.now()}`,
    contactPhone: '08031234567',
    email: account.email,
    password: account.password,
    loginMethod: 'email'
  });
  return account;
}
