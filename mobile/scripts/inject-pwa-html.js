// Post-build step for the web/PWA export.
//
// Expo Router's SPA mode (app.json web.output: "single") renders its own dist/index.html from
// an internal template and ignores app/+html.tsx (that hook only runs for static rendering).
// So we patch the generated index.html here to add the PWA head tags and register the service
// worker. Run automatically by `npm run build:web` after `expo export`.

const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`[inject-pwa-html] ${indexPath} not found. Run \`expo export -p web\` first.`);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Idempotent: skip if we already patched this file.
if (html.includes('rel="manifest"')) {
  console.log('[inject-pwa-html] Already patched, skipping.');
  process.exit(0);
}

const headTags = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#208AEF" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Faye Coins" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
`;

const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function (err) {
            console.warn('Service worker registration failed:', err);
          });
        });
      }
    </script>
`;

// Widen the viewport for iOS standalone (safe-area / notch) before inserting our tags.
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

html = html.replace('</head>', `${headTags}${swScript}  </head>`);

fs.writeFileSync(indexPath, html);
console.log('[inject-pwa-html] Injected PWA head tags + service worker registration.');
