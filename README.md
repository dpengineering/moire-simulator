# Moiré Simulator — Custom Rotating Images

A browser-based tool for creating moiré interference effects. Upload two disk
designs, stack them, and spin each independently to explore the patterns they
produce. Everything runs client-side — no upload leaves your browser.

**Live site:** https://dpengineering.github.io/moire-simulator/

## Features

- Two independent image layers (blended with `mix-blend-mode: multiply`)
- Per-layer rotation speed and direction
- Start / pause / resume / reset playback
- "Same Design" mirroring, with an optional horizontal flip
- Solid or animated background color
- Export a seamlessly-looping GIF of the animation (loop length = the exact
  point where the pattern repeats)
- Fully responsive layout

## Running locally

It's a static site — just serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Credits

- Created by Aayush Kokate
- Beautified by Sean Wirtz and Aayush Kokate
