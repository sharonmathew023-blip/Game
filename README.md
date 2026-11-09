# DEAD ZONE: OUTBREAK 3D

A browser-based 3D zombie survival FPS prototype built with Three.js.

## Features

- 3D arena rendered in the browser.
- First-person combat and weapon handling.
- Zombie enemies and wave-based survival.
- Player health, score, and streak HUD.
- Supply drops, hit feedback, and combat effects.
- Touch and pointer input support for mobile play.
- No build step required for the static frontend.

## Technology

- HTML, CSS, and vanilla JavaScript.
- [Three.js](https://threejs.org/) for 3D rendering.
- Tailwind CSS CDN for utility styling.
- Google Fonts for the game interface.

## Run locally

Because the project loads JavaScript and external assets, serve the repository over HTTP instead of opening the file directly:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Browser notes

- Use a modern browser with WebGL enabled.
- Allow pointer lock/fullscreen when prompted for desktop controls.
- Performance depends on device GPU and browser support.
- External libraries and fonts load from CDNs, so the first load requires internet access.

## Deployment

The static game is published through GitHub Pages from the `main` branch.

## License

No license is currently specified. All rights remain with the repository owner unless a license is added.
