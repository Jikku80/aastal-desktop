electron-builder requires these icon files to exist in this directory before
`npm run electron:dist` will succeed — it does NOT generate placeholders:

  icon.ico   (Windows — multi-resolution, typically 256x256 down to 16x16)
  icon.icns  (macOS — multi-resolution iconset)
  icon.png   (Linux — 512x512 recommended)

None are included here. Add your actual app icon in these three formats
before packaging, or electron-builder will fail at the icon-resolution step.
