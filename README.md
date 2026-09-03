# Ahmed Aziz Ben Aissa — AI Systems Engineer

This repository contains the source for Ahmed Aziz Ben Aissa’s portfolio. It is a lightweight, evidence-led React website focused on agentic AI, MCP systems, retrieval-augmented generation, applied AI research, responsible AI, and production engineering.

The site is designed for the canonical origin `https://ahmedazizbenaissa.me`. Repository configuration and a draft pull request do not, by themselves, establish that this redesign has been deployed.

## Architecture

- React 19 and React DOM 19 with JavaScript and JSX.
- Vite 8 in multi-page mode with `base: '/'` and public-directory copying disabled.
- Real HTML resources for `/` and `/projects/`.
- Build-time rendering with `react-dom/server` so both pages contain their complete core content before JavaScript runs.
- Selective `hydrateRoot` enhancements for navigation and project filtering.
- Semantic HTML, plain CSS and CSS Modules using the approved deep-navy and teal design system.
- Local structured content in `src/data/`, protected by schemas, publication gates and privacy validation.
- Small curated inline SVG icons; no external icon catalogue or remote asset dependency.

## Routes

- `/` — homepage with capabilities, featured work, experience, skills, certifications, education and direct contact links.
- `/projects/` — static Projects page with an optional client-side category filter. Without JavaScript, all published projects remain visible.
- `/404.html` — static GitHub Pages fallback with safe navigation back to the website.

## Local development

Use a compatible Node release; the repository declares Node `>=22.12.0` and records the preferred major release in `.nvmrc`.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run dev
```

The development server is intended for local authoring. Generated output is not committed.

## Content and publication safety

Portfolio data is maintained in `src/data/`. Public selectors expose only entries that satisfy the reviewed publication contracts. Validation covers structured facts, links, privacy boundaries, project evidence, metadata and public assets.

Do not add private recovery data, résumés, certificate images, employer code, secrets, telephone numbers, signed URLs or environment values to public source or generated output. Keep local evidence under the ignored `private/` directory.

## Validation and tests

Useful focused commands include:

```powershell
npm.cmd run validate:legacy
npm.cmd run validate:content
npm.cmd run validate:metadata
npm.cmd run validate:workflow
npm.cmd run verify:assets
npm.cmd run verify:crawl
npm.cmd run lint
npm.cmd run test:run
```

The legacy-removal validator checks the effective tracked tree, current source imports, direct dependency boundary, output ignores and the single Vite/React entry architecture.

## Production build

```powershell
npm.cmd run build
npm.cmd run verify:dist
npm.cmd run check:budgets
npm.cmd run verify:browser
```

The build sequence validates the repository, builds both Vite HTML entries, creates a temporary server-render bundle, injects static React markup into both pages, copies only approved assets and crawl files, removes temporary prerender output, and verifies the final distribution.

`dist/` is ignored. A valid production distribution contains exactly 14 trusted regular files and no source maps, private material, recovery files or server bundle.

For a persistent local review of an already completed distribution:

```powershell
npm.cmd run preview:quality
```

This serves the generated site at `http://127.0.0.1:4173` until the process is stopped.

## Complete quality gate

```powershell
npm.cmd run quality
```

The quality gate validates workflow policy, runs fail-on-warning linting and the full test suite, performs the production build, checks static HTML and budgets, exercises hydration and no-JavaScript behavior in a local browser, runs the responsive Axe matrix, and completes production and full dependency audits.

## GitHub Pages delivery design

`.github/workflows/pages.yml` defines the reviewed GitHub Actions pipeline:

- pull requests targeting `main` run verification and prepare a short-retention Pages artifact;
- deployment credentials and the `github-pages` environment are unavailable to verification and preparation jobs;
- deployment is guarded to canonical-repository pushes on `main` only;
- dependencies are installed with `npm ci --ignore-scripts`;
- the production distribution is rebuilt and verified immediately before upload.

The generated `dist/` directory must remain outside Git history. Publishing, merging, Pages settings, DNS and the custom-domain release decision are separate owner-controlled operations.

## Direct dependencies

Production:

- `react` `19.2.8`
- `react-dom` `19.2.8`

Development and verification:

- `@vitejs/plugin-react` `6.0.5`
- `vite` `8.2.1`
- `axe-core` `4.13.0`
- `oxlint` `1.81.0`

Dependency declarations are exact and `package-lock.json` is authoritative. Do not use update or audit-fix commands as part of routine verification.

## Documentation

The approved architecture, content, accessibility, privacy, SEO and migration decisions are recorded in `docs/WEBSITE_REDESIGN_SPEC.md`.
