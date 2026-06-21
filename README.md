# Nouvelle Vague Intelligence

A new wave in intelligence.

The official website for Nouvelle Vague Intelligence — a static site (HTML, CSS, vanilla JS), hosted on GitHub Pages at **https://nvintelligence.group/**.

## Structure

- `index.html` — home (`/`)
- `people/index.html` — the team (`/people/`)
- `license/index.html` — license & usage (`/license/`)
- `nv.css` — styles
- `nv.js`, `wave-bg.js` — scroll reveal + animated wave background
- `assets/` — logo and images

Pages use clean, extensionless URLs (folder + `index.html`) with absolute asset paths (`/nv.css`, `/assets/...`), served from the root of the `nvintelligence.group` custom domain.

## Running locally

It's a static site, but the absolute paths need a server root — serve the folder rather than opening the file directly:

```
python -m http.server 8000
```

Then visit http://localhost:8000.
