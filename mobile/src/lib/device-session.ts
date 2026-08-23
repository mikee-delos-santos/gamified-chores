// Device binding for the kid app: a device stays locked to one kid until a grown-up switches it.
// The bound kid is persisted locally (localStorage on web, SecureStore on native) via token-store.

import { deleteToken, getToken, setToken } from './token-store';

const BOUND_KID_KEY = 'chore_bound_kid';

export interface BoundKid {
  id: number;
  name: string;
}

export async function getBoundKid(): Promise<BoundKid | null> {
  const raw = await getToken(BOUND_KID_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BoundKid;
  } catch {
    return null;
  }
}

export async function setBoundKid(kid: BoundKid): Promise<void> {
  await setToken(BOUND_KID_KEY, JSON.stringify(kid));
}

export async function clearBoundKid(): Promise<void> {
  await deleteToken(BOUND_KID_KEY);
}
