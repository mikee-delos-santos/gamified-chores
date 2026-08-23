# 2. PWA-first distribution, drop video

Date: 2026-08-18

## Status

Accepted

## Context

The app is meant to be handed to the owner's kids and used by two admins (owner + spouse).
Both parent phones are iOS. We looked at how to get the app onto those devices.

Native distribution is friction-heavy for a pet project. Android sideloading needs no
developer mode, but a sideloaded APK does not auto-update. iOS has no free durable sideload:
TestFlight needs the paid Apple Developer Program, and free dev-signing forces Developer Mode
on the device plus a 7-day re-sign cycle.

A PWA removes all of that. No store, no signing, no sideload, no developer mode, instant
updates from a URL. The one part of our loop that a PWA handles badly is video: capturing
and uploading large video files from an iOS home-screen PWA has no reliable background or
resumable upload, and that upload sits at the center of the kid "proof" flow (PC-4). Photos
are small and upload fine. Playback of any hosted video is fine everywhere; only capture and
upload are the problem.

## Decision

1. **PWA is the primary target.** Ship the Expo app as an installable web/PWA. Keep the
   native Expo/EAS path alive but deprioritized (PWA-first, native later), so we can graduate
   to native builds if a future feature demands native capability.
2. **Drop video entirely, both sides.** No kid video proof and no parent how-to video. This
   removes the single feature that made a PWA impractical on iOS.
3. **Proof is photo-only.** Kids attach a still image as proof.
4. **How-to is photo + text.** Admins attach one or more still images plus written steps on
   the chore detail, instead of a how-to video.

## Consequences

- PC-4 (Media) is rescoped from video to photo-only: photo proof from kids, photo + text
  how-to from admins.
- The kid-app design's "photo or video proof" and "how-to video" (see
  `docs/superpowers/specs/2026-08-18-kid-app-design.md`) become photo/text; the prototype in
  `docs/design/kid-app/` still shows video slots and is now ahead of scope on that point.
- PC-5 (Push) changes shape: Expo's push service (FCM/APNs) does not work in a PWA, so PC-5
  becomes standard Web Push (VAPID keys, a `push` + `notificationclick` handler in the service
  worker, per-device push subscriptions stored on the backend, and the Rails side sending via
  the web-push protocol). On iOS, Web Push only works for a PWA added to the home screen and
  opened in standalone mode (iOS 16.4+), never in a Safari tab, and the permission prompt must
  fire from a user tap. Standalone PWA push is disabled inside the EU; we are not in the EU.
- iOS push is still weaker as a PWA than native, and PWA storage can be evicted on iOS after
  prolonged disuse, which can drop a device-bound kid session and force re-pairing. Accepted
  for now; revisit if it bites.
- The Apple Developer membership and EAS Android/iOS build work under PC-1 are parked, not
  cancelled.
- New backend media handling only needs to accept images, not video, for the MVP media epic.
