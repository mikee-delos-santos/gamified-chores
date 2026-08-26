// Railway pre-deploy hook (web service): tell the backend a new web version just shipped so it
// can push a "please refresh" notification to closed apps (see POST /push/app_update).
//
// Best-effort and non-fatal: a failure here must never block a deploy. Auth is a shared secret
// (DEPLOY_HOOK_SECRET) set on both this service and the backend; no user token is involved.

const API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const SECRET = process.env.DEPLOY_HOOK_SECRET || '';

async function main() {
  if (!API || !SECRET) {
    console.log('[notify-deploy] EXPO_PUBLIC_API_URL or DEPLOY_HOOK_SECRET unset; skipping.');
    return;
  }
  const res = await fetch(`${API}/push/app_update`, {
    method: 'POST',
    headers: { 'X-Deploy-Secret': SECRET },
  });
  const body = await res.text();
  console.log(`[notify-deploy] POST ${API}/push/app_update -> ${res.status} ${body}`);
}

main().catch((err) => {
  // Swallow: never fail the deploy over a notification.
  console.warn('[notify-deploy] failed (ignored):', err && err.message ? err.message : err);
});
