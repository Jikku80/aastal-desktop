electron-builder requires these icon files to exist in this directory before
`npm run dist` will succeed — it does NOT generate placeholders:

  icon.ico   (Windows — multi-resolution, 16..256px)
  icon.icns  (macOS — multi-resolution iconset)
  icon.png   (Linux — 512x512)

All three are present and were regenerated on 2026-07-08 to fix a "logo
looks tiny/squeezed" bug: the previous artwork's actual visible content
only filled ~32% width / ~52% height of the 512x512 canvas (a lot of
transparent padding around a small, non-square logo), which is exactly
what makes an app icon look small/squeezed in a Linux taskbar/app-switcher
(and would look the same in the Windows Start Menu and macOS Dock, since
all three formats come from the same source art). Fixed by cropping the
logo to its actual content bounds, re-centering it on a square canvas so it
fills ~82% of the frame (standard app-icon convention), then regenerating
all three formats from that corrected image.

If you replace this artwork later: check that the logo's non-transparent
pixels fill roughly 80-90% of the square canvas before exporting. A quick
sanity check in Python:

  from PIL import Image
  im = Image.open('icon.png').convert('RGBA')
  b = im.getbbox()
  print((b[2]-b[0]) / im.width, (b[3]-b[1]) / im.height)  # want ~0.8-0.9

── macOS "can't be opened" / Gatekeeper ─────────────────────────────────
A build produced without CSC_LINK / APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD
/ APPLE_TEAM_ID set (see electron/.env.example) is unsigned and
unnotarized. That's why a fresh Mac may refuse to open the .app at all
("is damaged and can't be opened" / "cannot verify developer") — this is
Gatekeeper working as intended on an unsigned app downloaded from the
internet, not a bug in the app. Until real Apple Developer Program
credentials are added as GitHub Actions secrets:

  End-user workaround (per install, one time):
    1. Right-click (or Control-click) the app in Finder -> "Open" -> "Open"
       again in the dialog. On newer macOS this option only appears after
       you've tried and failed to open it normally once.
    2. If that option isn't offered: System Settings -> Privacy & Security
       -> scroll down -> "Open Anyway" next to the blocked-app notice, then
       confirm.
    3. If it still refuses ("damaged"), the quarantine flag needs clearing
       manually from Terminal:
         xattr -cr /Applications/Aastal.app
       (Gatekeeper's "damaged" message on an unsigned app is frequently
       just the quarantine attribute, not actual corruption.)

  Permanent fix: enroll in the Apple Developer Program ($99/yr), generate
  a Developer ID Application certificate + app-specific password, and add
  CSC_LINK / CSC_KEY_PASSWORD / APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD /
  APPLE_TEAM_ID as GitHub Actions secrets — notarize.js and the mac
  build config already handle the rest automatically once those exist.
