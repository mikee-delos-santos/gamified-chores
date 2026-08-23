// Minimal API client for the gamified-chores backend.
//
// The base URL comes from EXPO_PUBLIC_API_URL (Expo inlines EXPO_PUBLIC_* at build time).
// See .env.example. Android emulators reach the host machine at 10.0.2.2, not localhost.

import { Platform } from 'react-native';

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

export type ChoreStatus = 'open' | 'completed' | 'rejected' | 'expired';

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
  how_to_photo_urls: string[];
  proof_photo_url: string | null;
}

/** A reusable chore an admin posts on demand. No completion state. */
export interface ChoreTemplate {
  id: number;
  title: string;
  description: string | null;
  reward_coins: number;
  how_to_photo_urls: string[];
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

// --- Chore templates (recurring chores; admin, Bearer token) ---

export async function listChoreTemplates(token: string): Promise<ChoreTemplate[]> {
  const res = await apiFetch('/chore_templates', { headers: authHeaders(token) });
  return json<ChoreTemplate[]>(res);
}

export async function createChoreTemplate(
  token: string,
  input: CreateChoreInput,
): Promise<ChoreTemplate> {
  const res = await apiFetch('/chore_templates', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return json<ChoreTemplate>(res);
}

export async function updateChoreTemplate(
  token: string,
  id: number,
  input: CreateChoreInput,
): Promise<ChoreTemplate> {
  const res = await apiFetch(`/chore_templates/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return json<ChoreTemplate>(res);
}

export async function deleteChoreTemplate(token: string, id: number): Promise<void> {
  await apiFetch(`/chore_templates/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

/** Spawn a fresh open chore from a template. Returns the new chore. */
export async function postChoreTemplate(token: string, id: number): Promise<Chore> {
  const res = await apiFetch(`/chore_templates/${id}/post_chore`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return json<Chore>(res);
}

/** Retire a live open chore that no longer applies. Returns the expired chore. */
export async function expireChore(token: string, id: number): Promise<Chore> {
  const res = await apiFetch(`/chores/${id}/expire`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return json<Chore>(res);
}

// --- Photo uploads (multipart) ---
// Turn local image URIs (from expo-image-picker) into a multipart body. On web a URI is a
// blob: URL we fetch back into a Blob; on native, RN's FormData accepts a {uri,name,type} file.
async function imageFormData(field: string, uris: string[]): Promise<FormData> {
  const form = new FormData();
  for (let i = 0; i < uris.length; i += 1) {
    if (Platform.OS === 'web') {
      const blob = await fetch(uris[i]).then((r) => r.blob());
      form.append(field, blob, `photo-${Date.now()}-${i}.jpg`);
    } else {
      // React Native FormData file descriptor.
      form.append(field, { uri: uris[i], name: `photo-${i}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    }
  }
  return form;
}

/** Attach one or more admin how-to photos to a chore (multipart PATCH). */
export async function uploadHowToPhotos(token: string, id: number, uris: string[]): Promise<Chore> {
  const res = await fetch(`${API_URL}/chores/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token), // no Content-Type: let the runtime set the multipart boundary
    body: await imageFormData('how_to_photos[]', uris),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ''));
  return json<Chore>(res);
}

/** Attach how-to photos to a template (multipart PATCH). */
export async function uploadTemplateHowToPhotos(
  token: string,
  id: number,
  uris: string[],
): Promise<ChoreTemplate> {
  const res = await fetch(`${API_URL}/chore_templates/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token), // no Content-Type: runtime sets the multipart boundary
    body: await imageFormData('how_to_photos[]', uris),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ''));
  return json<ChoreTemplate>(res);
}

/** Attach a kid's proof photo to a chore (multipart POST, unauthenticated). `by` is the kid's
 * name, used only to personalize the "ready to check" notification. */
export async function uploadProofPhoto(id: number, uri: string, by?: string): Promise<Chore> {
  const form = await imageFormData('proof_photo', [uri]);
  if (by) form.append('by', by);
  const res = await fetch(`${API_URL}/chores/${id}/proof`, { method: 'POST', body: form });
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ''));
  return json<Chore>(res);
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

/** Kid-facing list of chores still to do (unauthenticated). */
export async function listOpenChores(): Promise<Chore[]> {
  const res = await apiFetch('/open_chores');
  return json<Chore[]>(res);
}

// --- Grown-up PIN (device binding) ---

export async function setFamilyPin(token: string, pin: string): Promise<void> {
  await apiFetch('/family/pin', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ pin }),
  });
}

export async function getPinStatus(): Promise<boolean> {
  const res = await apiFetch('/family/pin_status');
  return (await json<{ pin_set: boolean }>(res)).pin_set;
}

export async function verifyFamilyPin(pin: string): Promise<boolean> {
  const res = await apiFetch('/family/verify_pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  return (await json<{ ok: boolean }>(res)).ok;
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
