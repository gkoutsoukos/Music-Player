# Particle Egg Music Player v3 — Control Overhaul

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
