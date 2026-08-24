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

// Boot splash: Faye's face on a blue field, shown the instant the page paints and dismissed
// within a 2-second budget. The face is inlined as base64 so it shows before any bundle or
// network request resolves, which is the whole point - a consistent "loading Faye" screen on
// every boot, not just the first PWA install. Colors match the manifest (#208AEF).
// Uses a dedicated high-res crop (boot-face.jpg) rather than the low-res favicon.
const faceB64 = fs
  .readFileSync(path.join(__dirname, '..', 'assets', 'images', 'boot-face.jpg'))
  .toString('base64');

const bootSplash = `
    <style>
      #faye-boot-splash{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:28px;background:#208AEF;
        animation:fbs-out .4s ease-in 1.55s forwards}
      #faye-boot-splash .fbs-face{width:128px;height:128px;border-radius:50%;overflow:hidden;
        background:#fff;border:4px solid rgba(255,255,255,.9);box-shadow:0 12px 30px rgba(0,0,0,.25);
        opacity:0;transform:scale(.6);
        animation:fbs-pop .5s cubic-bezier(.34,1.56,.64,1) forwards,fbs-breathe 1.8s ease-in-out .5s infinite}
      #faye-boot-splash .fbs-face img{width:100%;height:100%;object-fit:cover;display:block}
      #faye-boot-splash .fbs-dots{display:flex;gap:10px}
      #faye-boot-splash .fbs-dots span{width:10px;height:10px;border-radius:50%;
        background:rgba(255,255,255,.9);animation:fbs-blink 1s ease-in-out infinite}
      #faye-boot-splash .fbs-dots span:nth-child(2){animation-delay:.15s}
      #faye-boot-splash .fbs-dots span:nth-child(3){animation-delay:.3s}
      @keyframes fbs-pop{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
      @keyframes fbs-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
      @keyframes fbs-blink{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
      @keyframes fbs-out{to{opacity:0;visibility:hidden}}
      @media (prefers-reduced-motion:reduce){
        #faye-boot-splash{animation:fbs-out .3s ease-in 1.6s forwards}
        #faye-boot-splash .fbs-face{opacity:1;transform:none;animation:none}
        #faye-boot-splash .fbs-dots span{animation:none;opacity:.7}
      }
    </style>
    <div id="faye-boot-splash" role="status" aria-label="Loading Faye Coins">
      <div class="fbs-face"><img src="data:image/jpeg;base64,${faceB64}" alt="Faye" /></div>
      <div class="fbs-dots"><span></span><span></span><span></span></div>
    </div>
    <script>
      // Hard cap on the splash: remove the node just after its fade-out ends, so nothing lingers
      // past the 2s budget even if the bundle is still warming up.
      (function () {
        setTimeout(function () {
          var el = document.getElementById('faye-boot-splash');
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 1950);
      })();
    </script>
`;

// Widen the viewport for iOS standalone (safe-area / notch) before inserting our tags.
html = html.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

html = html.replace('</head>', `${headTags}${swScript}  </head>`);

// Paint the splash before the app root so it covers the screen from the first frame.
html = html.replace(/<body[^>]*>/, (bodyTag) => `${bodyTag}${bootSplash}`);

fs.writeFileSync(indexPath, html);
console.log('[inject-pwa-html] Injected PWA head tags + service worker registration + boot splash.');
