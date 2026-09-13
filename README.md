# Richmond Owusu Duah

Public professional portfolio at [rowusuduah.github.io](https://rowusuduah.github.io/), focused on transportation engineering, research, and public software work.

## Local development

Use Node.js 20 or later. No dependency installation or build step is needed.

```sh
node scripts/serve.mjs
node scripts/check.mjs
```

The preview runs at `http://127.0.0.1:8126`. Set `PORT` to use another port. Refresh the browser after editing.

## Content and deployment

- `index.html`: seven focused views: overview, experience, projects, research, education, leadership, and contact. Eight detailed project profiles and a compact register preserve all 22 professional assignments.
- `resume.html`: public résumé with a two-page print layout. Its button opens the browser print dialog, where visitors can save a PDF.
- `assets/site.css` and `assets/site.js`: navy/blue styling, sidebar navigation, hash routing, project filters, light/dark themes, and motion preferences. Browser back/forward and direct section links work.
- `assets/traffic.js`: lightweight canvas signal sequence, with optional demand/speed controls. Rendering is capped at 30 fps and pauses offscreen, in inactive tabs, and for motion preferences.
- `assets/images/`: resized, metadata-free WebP headshots and responsive transportation photographs.
- `credits.html` and `assets/images/projects/credits.json`: attribution, original sources, licenses, and metadata for all five real photographs.
- `assets/fonts/`: locally hosted Manrope with its SIL Open Font License notice. Obtained from `@fontsource-variable/manrope@5.2.8`.
- `assets/brands/`: original Stantec, USF, and KNUST marks with official-source provenance; displayed locally on white plates.
- `assets/social-preview.svg` / `.png`: the shared 1200 × 630 link-preview design. Canonical URLs, social tags, and public profile JSON-LD are described in `docs/METADATA-AND-IDENTITY.md`.

GitHub Pages publishes the repository root on `main`. `.nojekyll` is intentional. Pushes should pass `node scripts/check.mjs` and desktop/mobile browser review first.

## Public information boundary

Do not add source résumés, personal phone numbers, email addresses, street addresses, precise locations, credentials, private repository details, client files, or original photographs. Use LinkedIn and GitHub for contact. Only include professional claims supported by the résumé or a verified public source.

The freely licensed transportation photographs are illustrative context, not photographs of the named project sites. The signal animation is a simplified demonstration, not a calibrated model or measured project result. DRAFE is identified as a coauthored 2026 arXiv preprint. Public project links are checked before inclusion.

All fonts, scripts, styles, and images are served locally. There are no analytics, embeds, external form handlers, or third-party runtime requests. Theme preference is stored locally; motion preference is session-only. Without JavaScript, sections remain readable and anchor navigation and native disclosures work. Reduced-motion preferences are respected.

The source guard checks links, fragments, SVG symbols, headings, common personal-data patterns, source-document exclusions, external runtime dependencies, image metadata, CSP, and photo attribution. It reports initial transfer estimates separately from the lazy-loaded photo library. Browser QA also covers every view, mobile navigation, keyboard focus, filtering, disclosures, themes, and motion controls.
