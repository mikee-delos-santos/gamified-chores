// Minimal API client for the gamified-chores backend.
//
// The base URL comes from EXPO_PUBLIC_API_URL (Expo inlines EXPO_PUBLIC_* at build time).
// See .env.example. Android emulators reach the host machine at 10.0.2.2, not localhost.

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

/** Fetch a path on the backend, throwing ApiError on non-2xx. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => ''));
  }
  return res;
}

/** True when the backend /health endpoint responds OK. Never throws. */
export async function getHealth(): Promise<boolean> {
  try {
    const res = await apiFetch('/health');
    return res.ok;
  } catch {
    return false;
  }
}

// --- Entity types (mirror the backend JSON; money-ish fields arrive as floats) ---

export type Role = 'admin';

export interface Admin {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export type ChoreStatus = 'open' | 'completed' | 'rejected';

export interface Chore {
  id: number;
  title: string;
  description: string | null;
  reward_coins: number;
  status: ChoreStatus;
  grade: number | null;
  created_by: number | null;
  completed_by: number | null;
  completed_at: string | null;
}

/** A chore plus the award/balance that completing it produced. */
export interface CompleteResult extends Chore {
  awarded: number;
  child_balance: number;
}

export interface ChildProfile {
  id: number;
  name: string;
  balance: number;
}

export interface CompletedChore {
  id: number;
  title: string;
  reward_coins: number;
  grade: number | null;
  awarded: number;
  completed_at: string | null;
}

export interface ChildProfileDetail extends ChildProfile {
  completed_chores: CompletedChore[];
}

export interface LoginResult {
  token: string;
  user: Admin;
}

// --- Request helpers ---

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

// --- Admin auth ---

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return json<LoginResult>(res);
}

/** Validate a stored token; resolves to the current admin or throws ApiError (401 when stale). */
export async function getMe(token: string): Promise<Admin> {
  const res = await apiFetch('/me', { headers: authHeaders(token) });
  return json<Admin>(res);
}

// --- Chores (admin, Bearer token) ---

export async function listChores(token: string): Promise<Chore[]> {
  const res = await apiFetch('/chores', { headers: authHeaders(token) });
  return json<Chore[]>(res);
}

export interface CreateChoreInput {
  title: string;
  description?: string;
  reward_coins: number;
}

export async function createChore(token: string, input: CreateChoreInput): Promise<Chore> {
  const res = await apiFetch('/chores', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return json<Chore>(res);
}

export async function updateChore(
  token: string,
  id: number,
  input: CreateChoreInput,
): Promise<Chore> {
  const res = await apiFetch(`/chores/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return json<Chore>(res);
}

export async function deleteChore(token: string, id: number): Promise<void> {
  await apiFetch(`/chores/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

export interface CompleteChoreInput {
  child_profile_id: number;
  grade: number;
}

export async function completeChore(
  token: string,
  id: number,
  input: CompleteChoreInput,
): Promise<CompleteResult> {
  const res = await apiFetch(`/chores/${id}/complete`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return json<CompleteResult>(res);
}

// --- Child profiles (kid-facing, no token) ---

export async function listChildProfiles(): Promise<ChildProfile[]> {
  const res = await apiFetch('/child_profiles');
  return json<ChildProfile[]>(res);
}

export async function getChildProfile(id: number): Promise<ChildProfileDetail> {
  const res = await apiFetch(`/child_profiles/${id}`);
  return json<ChildProfileDetail>(res);
}

// --- Child profile management (admin) ---

export async function createChildProfile(token: string, name: string): Promise<ChildProfile> {
  const res = await apiFetch('/child_profiles', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return json<ChildProfile>(res);
}

export async function renameChildProfile(
  token: string,
  id: number,
  name: string,
): Promise<ChildProfile> {
  const res = await apiFetch(`/child_profiles/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return json<ChildProfile>(res);
}

export async function deleteChildProfile(token: string, id: number): Promise<void> {
  await apiFetch(`/child_profiles/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

// --- Super admin (admin, destructive) ---

export async function destroyAllChores(token: string): Promise<{ destroyed: number }> {
  const res = await apiFetch('/admin/destroy_chores', { method: 'POST', headers: authHeaders(token) });
  return json<{ destroyed: number }>(res);
}

export async function resetAllCoins(token: string): Promise<{ removed_transactions: number }> {
  const res = await apiFetch('/admin/reset_coins', { method: 'POST', headers: authHeaders(token) });
  return json<{ removed_transactions: number }>(res);
}
