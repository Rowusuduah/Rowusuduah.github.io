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

- `index.html`: portfolio content and diagrams.
- `resume.html`: public résumé with a two-page print layout. Its button opens the browser print dialog, where visitors can save a PDF.
- `assets/site.css` and `assets/site.js`: responsive styling and progressive motion/navigation enhancements.
- `assets/images/`: resized, metadata-free WebP portraits.
- `assets/fonts/`: locally hosted Manrope and Instrument Serif, with their SIL Open Font License notices. Files obtained from Fontsource packages `@fontsource-variable/manrope@5.2.8` and `@fontsource/instrument-serif@5.2.8`.

GitHub Pages publishes the repository root on `main`. `.nojekyll` is intentional. Pushes should pass `node scripts/check.mjs` and desktop/mobile browser review first.

## Public information boundary

Do not add source résumés, personal phone numbers, email addresses, street addresses, precise locations, credentials, private repository details, client files, or original photographs. Use LinkedIn and GitHub for contact. Only include professional claims supported by the résumé or a verified public source.

The diagrams are original schematic illustrations, not client models, measured results, or research figures. DRAFE is identified as a coauthored 2026 arXiv preprint, not a peer-reviewed publication. Public project links are checked before inclusion.

All fonts, scripts, styles, and images are served locally. There are no analytics, embeds, external form handlers, or third-party runtime requests. The optional motion preference is stored for the current browser session. Native disclosures and all core content work without JavaScript; reduced-motion preferences are respected.

The source guard checks links, duplicate anchors, headings, common personal-data patterns, source-document exclusions, external runtime dependencies, and an initial asset budget below 160 KB. It complements, rather than replaces, human review of content and responsive layouts.
