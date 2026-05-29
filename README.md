# DriveAmp

A personal, browser-based music player inspired by Winamp and modern streaming apps.

## Current version

This is the modular base version converted from the working V0.2.1 prototype.

## Repository structure

```text
driveamp/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── assets/
│   └── README.md
└── README.md
```

## Current features

- Local file playback
- Local folder playback
- One-button Play/Pause
- Search
- Shuffle
- Repeat
- Track duration detection
- Embedded metadata reading
- Embedded album art display
- iTunes-style sorting: artist → album → track number
- Web Audio API engine
- Purist / Hi-Fi / Winamp EQ modes
- 5-band EQ panel
- Preamp and volume control
- Demo mode

## How to use

Open `index.html` in a browser.

For GitHub Pages:

1. Upload all files and folders to your repository.
2. Enable GitHub Pages.
3. Set the source to the main branch/root folder.
4. Open the GitHub Pages URL.

## Important notes

Metadata and artwork reading currently use `jsmediatags` from CDN:

```html
https://cdn.jsdelivr.net/npm/jsmediatags@3.9.7/dist/jsmediatags.min.js
```

If the app is opened without internet, playback still works, but metadata/artwork may fall back to folder and filename.

For local files, the browser cannot permanently remember file paths after refresh. This is normal browser security behavior.

## Next planned steps

1. Visual redesign: modern streaming layout + Winamp character.
2. Split `js/app.js` into modules:
   - `audio-engine.js`
   - `metadata.js`
   - `local-library.js`
   - `ui.js`
   - `google-drive.js`
3. Add Google Drive OAuth and folder scanning.
