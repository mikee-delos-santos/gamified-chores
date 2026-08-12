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
