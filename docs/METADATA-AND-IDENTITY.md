# Metadata and organization identity

Updated 13 September 2026.

## Public document metadata

The portfolio, résumé, and credits each have one production canonical URL, an author, a specific title and description, complete Open Graph fields, and a large-image social card. The shared 1200 × 630 PNG presents Richmond's existing professional headshot, name, Civil Engineer role at Stantec, and transportation focus. Its SVG source is maintained locally with the site; the photograph is unchanged. Browser and Apple touch icons are included.

Hash sections remain views of the same portfolio document. Their browser title and description follow the active section or featured project; they share the main canonical URL and static social preview. They are not advertised as separately indexed pages. Search engines and social services control their own indexing and cached previews.

The main page includes `ProfilePage` / `Person` JSON-LD containing only the public name, Civil Engineer title, employer, alumni institutions, professional interests, portrait, and LinkedIn/GitHub profiles. No contact details or unconfirmed credentials are included. The inline JSON-LD has an exact SHA-256 allowance in the existing strict CSP. Update that hash when editing the JSON-LD; `node scripts/check.mjs` checks it.

References: [Open Graph protocol](https://ogp.me/), [Google profile-page documentation](https://developers.google.com/search/docs/appearance/structured-data/profile-page), and [Schema.org Person](https://schema.org/Person).

## Organization marks and reading details

Official Stantec, USF, and KNUST marks replace the text placeholders in the relevant employer and degree cards. Stantec and USF marks also identify the corresponding leadership affiliations. Logos keep their original artwork and proportions, sit on white plates, and are lazy-loaded from this repository. They link to the official source. No live logo service, hotlink, or new runtime dependency is used.

`assets/brands/sources.json` records the source URL, original asset URL, usage reference, dimensions, byte count, and SHA-256 for each mark. The public credits page includes the same organizations. Original artwork is not repainted or treated as institutional endorsement.

Degree metadata separates graduation date, concentration, GPA, and honors. Institution names link to official sites. Coursework labels are larger; short section labels, capability icons, and restrained card shading support scanning. Professional facts and all 22 assignments remain intact.

## Maintenance and verification

- Run `node scripts/check.mjs` to check canonical/social consistency, preview dimensions, JSON-LD, CSP, credential/privacy boundaries, logo provenance, all 22 assignments, and local references.
- The site has no required build. For occasional preview/icon regeneration, run `node scripts/render-social.mjs <installed-sharp-module-entry>` using an available Sharp installation. SVG text uses Segoe UI/Arial; the website retains self-hosted Manrope. The rasterizer embeds a temporary PNG representation of the existing WebP portrait for SVG renderer compatibility.
- Review branded cards at desktop and 320px widths, both color themes, navigation titles/descriptions, logo loading, and browser console output before publishing.
- The social-preview PNG is fetched by sharing services, not as an eager page image. The core source-based transfer estimate is about 92 KiB compressed; logos and photographs are lazy-loaded.

## Verification for this release

All metadata, CSP, privacy, source-reference, 22-project, and logo-provenance checks passed. All seven views were checked at 320px without horizontal overflow; section titles and descriptions updated correctly and retained one active navigation item. Employer and education cards were inspected at desktop width, with the KNUST crest and USF lockup inspected on a phone. The leadership cards were inspected in the light theme, the education cards in the dark theme, and the browser console reported no warnings or errors. The 1200 × 630 PNG was visually checked with the portrait present.
