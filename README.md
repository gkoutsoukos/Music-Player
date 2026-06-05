# Particle Egg Music Player v8 — Clean Controls

A GitHub-ready music player concept with:

- black void / white particle visual identity
- organic egg-shaped particle visualizer with freer cloud-like movement
- denser particle clusters reacting to frequency bands
- song title and metadata under the orb
- minimal white controls with a CSS-drawn centered play/pause button
- local audio file loading
- playlist view opened by clicking/tapping the orb
- active track highlighting

## How to use

Upload these files to your GitHub Pages repo:

```text
index.html
css/player.css
js/player.js
assets/
README.md
```

Then open your GitHub Pages URL.

## How the interaction works

- Click **Load tracks** and select local audio files.
- Press **Play**.
- Click/tap the particle egg to open the playlist.
- Select a track from the playlist.
- Click × or press Escape to return to the main visualizer.

## Notes

This version uses the browser Web Audio API, so the visualizer reacts to audio only after playback starts.

Local files are not uploaded anywhere. They stay in the browser session.

## Suggested next refinements

1. Add album art extraction if files include embedded artwork.
2. Add drag-and-drop file loading.
3. Add saved playlist state using IndexedDB.
4. Add mobile swipe-down to close playlist.
5. Add a more advanced particle transition where the orb visually unfolds into the playlist rows.


## v2 changes

- Centered the play triangle by replacing the text glyph with a CSS-drawn icon.
- Added a proper CSS pause state.
- Made particle movement more free-form with wander, swirl, loose spring-back, and stronger frequency-driven motion.

## v3 changes

- Replaced the old loose control row with a compact transport dock.
- Redesigned previous / play / next controls as custom CSS shapes.
- Moved Playlist and Load into smaller secondary buttons below the transport.
- Reworked the progress bar styling so it feels less like a default web input.
- Overall lower UI is now more compact, centered, and closer to the particle-player identity.

## v4 changes

- Removed the visible text buttons from the main UI.
- Controls are now pure white iconography: previous / play-pause / next.
- Removed the play circle for a cleaner, more music-player-like direction.
- Converted Playlist and Load into small secondary white icons.
- Kept accessible labels for screen readers.

## v4 clean transport changes

- Removed all visible secondary buttons/icons from the bottom UI.
- Bottom UI now contains only previous / play-pause / next and the progress bar.
- Playlist opens only by tapping/clicking the orb.
- Loading files is triggered when pressing Play with no tracks loaded, or from the empty playlist prompt.

## v5 changes

- Reworked the lower area to match the intended poster-like structure:
  visualizer, song title, artist/album, previous/play/next, progress.
- Removed the transport-dock feeling.
- Changed previous/next to delicate chevrons instead of heavier transport symbols.
- Tightened vertical spacing so the controls sit naturally under the track information.

## v6 changes

- Reworked the visualizer so the form itself morphs with the music.
- The orb now behaves more like a liquid particle ball instead of a fixed egg/shell.
- Bass causes larger bulges and swelling.
- Mids drive broader organic deformation.
- Highs add surface agitation and shimmer.
- Increased particle count for a fuller white-particle body.
- Fixed play/pause icon state so it uses CSS class switching again.

## v7 changes

Added Google Drive API configuration files:

```text
js/config.js
js/google-drive.js
```

The config file contains:

```js
const GOOGLE_CLIENT_ID = "xxxxxxxx.apps.googleusercontent.com";
const GOOGLE_API_KEY = "xxxxxxxx";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/drive.file";
```

Replace the placeholder values locally with the credentials from your Google Cloud Console.

Important notes:

- Do not paste your real credentials into ChatGPT.
- For GitHub Pages, add your site URL to the OAuth allowed JavaScript origins.
- Restrict the API key in Google Cloud Console to your GitHub Pages domain and only the APIs you need.
- The current scope is `drive.file`, which is the safer direction because it limits access to files the user selects/creates with the app.
- This version only adds the configuration layer. The next step is wiring Google sign-in and Drive file selection into the player.


## v8 changes

- Ensured there are no visible items below the timeline.
- Kept only previous / play-pause / next above the timeline.
- Slightly increased previous/next visibility and tightened spacing around the center play button.
- Preserved the hidden file input, playlist behavior, and Google Drive config files.
