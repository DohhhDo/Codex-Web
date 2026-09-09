# Codex-Web icons

Run `node public/generate-icons.js` to regenerate browser and PWA icons from `public/logo.svg`.

The generator writes PNG, SVG and ICO variants, updates the favicon and Apple touch links in `index.html`, and points the manifest and notification worker at content-versioned URLs. This is required because deployed images use immutable cache headers. Run `npm run build:client` and install the frontend after changing the mark.
