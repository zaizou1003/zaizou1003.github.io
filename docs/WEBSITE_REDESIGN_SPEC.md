# Portfolio Website Redesign Specification

Specification date: 2026-08-10
Repository: `zaizou1003/zaizou1003.github.io`
Canonical production origin: `https://ahmedazizbenaissa.me`
Status: implementation blueprint for a controlled clean rebuild in the same repository

## Scope and decision record

This specification consolidates `WEBSITE_REPO_AUDIT.md`, `SOURCE_RECOVERY_PLAN.md`, `SOURCE_RECOVERY_RESULT.md`, and `DEPENDENCY_AUDIT.md`. It defines future work only. Creating this document does not authorize or perform source changes, dependency changes, installation, build generation, Git staging, commit, push, or deployment.

The rebuild is locked to these decisions:

- React and React DOM, built with Vite and its React plugin.
- JavaScript/JSX, semantic HTML, plain CSS or CSS Modules, and a small local inline-SVG set.
- Local, structured, publish-safe portfolio data; no database, CMS, or runtime API.
- A Vite multi-page application with real `/` and `/projects/` HTML entry points; no hash router and no React routing dependency.
- Build-time static pre-rendering of both page bodies with `react-dom/server`, followed by `hydrateRoot` in the browser only for interactive enhancement. Vite multi-page mode supplies the real HTML resources but is not, by itself, a React pre-renderer.
- GitHub Pages deployment from a GitHub Actions artifact. Generated `dist/` and legacy `build/` output must not be committed to the source branch.
- `https://ahmedazizbenaissa.me` is the only canonical origin. The Vite public base is `/`.
- No Firebase, Three.js, MyMind route/model, MUI, Emotion, styled-components, Tailwind, EmailJS, contact form, PWA/install code, external icon catalogue, lodash, Vercel analytics, or Web Vitals integration.
- No public telephone number, gender, nationality, signed URL, service identifier, employer code, or unnecessary personal structured-data field.

The owner has approved the deep navy visual direction, teal accents, and the colour-token values in section 8. They are implementation requirements rather than an open visual-design question.

Recovered `src/utils/data.js`, `src/utils/cv.pdf`, and certificate images are unapproved private recovery material. They are not an implementation input until individually reviewed and explicitly approved. Nothing in this specification copies their personal or signed values. The initial rebuild should omit a downloadable CV and certificate imagery unless publication approval is later recorded.

## Product objective

Present **Ahmed Aziz Ben Aissa** as an **AI Systems Engineer** who designs, evaluates, and communicates reliable applied-AI systems. The narrative must emphasize:

- Agentic AI
- Model Context Protocol systems
- Retrieval-augmented generation
- Applied AI research
- Responsible AI
- Production AI engineering
- Evaluation, safety, and reliability

The site should let a technical recruiter, engineering manager, or research collaborator answer four questions quickly:

1. What AI systems does Ahmed build?
2. What evidence supports the work?
3. What was Ahmed's role and whether the work was individual or collaborative?
4. How can the visitor inspect public artifacts or make contact?

Claims must be evidence-led. Do not invent metrics, dates, repositories, demos, paper links, employer responsibilities, or technology usage. A missing public repository is represented honestly by omitting the link, not by implying that private or employer code is available.

## 1. Final information architecture

### Public URL map

| URL | Build resource | Purpose | Indexing |
|---|---|---|---|
| `/` | `dist/index.html` | Statically pre-rendered main portfolio and complete professional narrative | Canonical, indexable |
| `/projects/` | `dist/projects/index.html` | Statically pre-rendered evidence-approved projects and technical work | Canonical, indexable |
| `/404.html` | `dist/404.html` copied from `public/404.html` | Small branded not-found page linking to `/` and `/projects/` | `noindex` |
| `/robots.txt` | Static public asset | Crawl policy and sitemap location | Public |
| `/sitemap.xml` | Static/generated public asset | Exactly the canonical `/` and `/projects/` resources | Public |

There is no `/mymind`, install/PWA route, contact form route, hash-based route, or template Terms route. A legal/privacy page should be introduced only if future functionality creates a real requirement and owner-approved text exists. The initial site has no analytics, form submission, cookies, or application storage.

### Homepage anchors

Use stable, human-readable IDs:

```text
#main
#capabilities
#featured-projects
#experience
#selected-work
#skills
#certifications
#education
#contact
```

Navigation links use ordinary anchors on the homepage. From `/projects/`, homepage section links use absolute-root forms such as `/#experience`. Project deep links may use `/projects/#european-air-quality-evidence-agent`; that fragment is a normal document anchor, not client-side routing.

### Content hierarchy

```text
Site
├── Home /
│   ├── Navigation
│   ├── Hero and value proposition
│   ├── AI Systems capabilities
│   ├── Three flagship projects
│   ├── Professional experience
│   ├── Selected technical work
│   ├── Skills
│   ├── Certifications
│   ├── Education
│   ├── Contact links
│   └── Footer
└── Projects /projects/
    ├── Page introduction
    ├── Accessible category filters, only if useful
    ├── Published project case-study summaries
    ├── Evidence and artifact links
    └── Shared contact/footer
```

## 2. Homepage section-by-section purpose

### 1. Accessible navigation

Purpose: identify the owner, provide direct access to major sections, and expose the real Projects page.

- Start with a “Skip to main content” link.
- Use `<header>` and a labelled `<nav>` containing real `<a>` elements.
- Desktop links: Capabilities, Projects, Experience, Skills, Certifications, Education, Contact.
- “All projects” links to `/projects/`.
- Mobile navigation uses a real `<button>` with `aria-expanded` and `aria-controls`; it closes on Escape, link activation, and outside focus as appropriate.
- Do not use lodash for scroll throttling. Prefer CSS/sticky layout and a lightweight event-free implementation; if scroll state is unnecessary, omit it.

### 2. Hero and value proposition

Purpose: establish identity and relevance within the first viewport.

- One `<h1>`: “Ahmed Aziz Ben Aissa”.
- Visible role: “AI Systems Engineer”.
- Recommended value proposition, subject to owner approval: “I design and evaluate reliable AI systems that connect agents, tools, retrieval, and production workflows.”
- A short supporting paragraph should connect applied research with safety, evaluation, and operational reliability without unsupported superlatives.
- Primary action: “View flagship projects” -> `#featured-projects`.
- Secondary action: “Explore all projects” -> `/projects/`.
- Contact icons are not required here; labelled text links are clearer.
- No typewriter animation, autoplay effect, canvas, decorative motion dependency, or unapproved CV download.

### 3. AI Systems capabilities

Purpose: translate the seven focus areas into a concise engineering capability model.

Use four semantic capability groups, not proficiency meters:

1. **Agents and tool protocols** — agent orchestration and MCP clients/servers, only where evidenced.
2. **Retrieval and evidence** — RAG, source grounding, evidence validation, provenance, and retrieval quality.
3. **Research and evaluation** — reproducible experiments, multi-seed evaluation, benchmarks, error analysis, and responsible-AI assessment.
4. **Production reliability** — system boundaries, security, observability, failure handling, safety, and maintainable delivery.

Each group links to project IDs that demonstrate it. Do not list a capability without an evidence reference.

### 4. Three flagship projects

Purpose: provide the strongest proof of the positioning. The homepage selector must render exactly three published projects, ordered only by `featuredOrder`:

1. **European Air-Quality Evidence Agent** — individual work by Ahmed; agentic AI, MCP, RAG, evidence validation, security, and evaluation.
2. **FinRL–DeepSeek Research Extension** — reinforcement learning and financial research; multi-seed experiments and reproducible quantitative results.
3. **MetaMind Responsible AI Learning Companion** — multi-agent learning system; persistent learner state, Socratic guidance, and responsible AI.

Each card includes problem, system approach, Ahmed's role, two or three verified evidence/result bullets, key technologies, and only the public links that actually exist. Link to the matching anchor on `/projects/`; do not open a modal.

Build-time data validation must fail when:

- the published featured set does not contain exactly three records;
- orders are not uniquely `[1, 2, 3]`;
- the titles/order differ from the locked list;
- an evidence claim lacks an approved source/method note; or
- a required image lacks alt text and dimensions.

### 5. Professional experience

Purpose: separate employment from personal/academic projects and show production context responsibly.

Order newest first:

1. **Ayming — apprenticeship**, October 2025–present. The exact approved job title, responsibilities, location, and outcomes remain content gates; do not invent them.
2. **VroomVroom — AI Systems Engineer internship**, June–August 2025.

Each entry shows employer, approved role title, employment type, ISO-derived date label, short scope, and two to four approved impact/responsibility bullets. VroomVroom is never represented as a personal project. Employer/client repositories are absent unless the employer has provided an explicitly public artifact. Add a short note where useful: “Employer work; implementation details and source code are not public.”

### 6. Selected technical work

Purpose: broaden the evidence without competing with the three flagships.

Initial eligible list:

- Knife & Gun Detection System
- BecknBridge / AI Clinic
- BioVision Wildlife Recognition
- LiveCoach, only after evidence is ready
- System Dynamics, only after evaluation is ready

Render only records whose `publicationStatus` is `published`. LiveCoach and System Dynamics must remain absent—not labelled “coming soon”—until their evidence gate passes. Selected-work cards are more compact than flagship cards and link to `/projects/#stable-id`.

### 7. Skills

Purpose: show an evidence-backed technical toolkit aligned with AI systems engineering.

- Group by system function rather than displaying a generic logo wall: agent/retrieval systems, ML/research, evaluation/responsible AI, production/data engineering, and programming foundations.
- Use text chips or small inline SVG only where an icon adds meaning.
- No percent bars, star ratings, or unsupported “expert” labels.
- Each skill may reference one or more project IDs; hide skills that cannot be evidenced or owner-confirmed.

### 8. Certifications

Purpose: provide three current, high-signal credentials in this exact order:

1. Microsoft Certified: Azure AI Apps and Agents Developer Associate
2. Anthropic: Introduction to Model Context Protocol
3. Hugging Face: AI Agent Course

Show issuer, exact credential title, verified issue/completion date when supplied, and a stable public credential link when available. Do not use signed URLs or recovered certificate images by default. Text-first cards with an optional approved issuer mark are sufficient.

### 9. Education

Purpose: provide concise academic context after professional and technical evidence.

- Migrate only owner-approved institution, program, and date facts.
- Use ISO source dates and a generated human-readable range.
- Grades, descriptions, and institutional images are optional and require explicit publication approval.
- Do not import the recovered education records wholesale.

### 10. Contact links

Purpose: offer low-friction contact without collecting visitor data.

Use a `<section>` with three clearly labelled direct links:

- Email (`mailto:` with the owner-approved public address)
- LinkedIn (verified public profile URL)
- GitHub (verified public profile URL)

No form, EmailJS, telephone number, Instagram requirement, tracking parameters, or copied service identifiers. The email address must be stored once in approved profile data, not repeated across components.

### 11. Footer

Purpose: finish navigation and provenance without duplicating an application feature.

- Owner name, role, current year, canonical home link, Projects link, and the same three contact links.
- No install button, PWA language, legal/template claims, or duplicate navigation arrays.
- A compact statement may say that the site is a lightweight React/Vite static portfolio hosted on GitHub Pages.

## 3. All Projects experience and routing

### Recommendation

Implement a Vite multi-page application with an explicit React pre-render step. Keep `index.html` at the repository root and add `projects/index.html` as a second HTML entry. Vite creates the two resources and their client bundles, but **Vite multi-page mode alone does not render React component content into those HTML files**. After the Vite client build, an SSR-targeted Vite build must bundle a local server entry that calls `renderToString` from `react-dom/server`; `scripts/prerender.mjs` must then inject the returned markup into both generated HTML mount elements.

The final output remains:

```text
dist/index.html
dist/projects/index.html
```

GitHub Pages serves `/projects/` by resolving the directory index. Normal links trigger normal document navigation, so browser history, page titles, canonical metadata, refresh, and direct entry are more predictable than the existing `/#/AllProjects` route. No `react-router-dom`, SPA fallback redirect, or hash route is required.

`vite.config.js` must define both client HTML inputs explicitly, define a deterministic SSR/prerender bundle output, and set `base: '/'`. The custom domain is a root deployment, so the old `/zaizou1003.github.io/` and `/portfolio-react/` bases must not reappear. The implementation should use Vite's own SSR build capability plus React DOM Server; no third-party prerendering framework or plugin is permitted unless a concrete, documented blocker is reproduced and separately approved.

### Static-render and hydration contract

- `src/entries/server.jsx` imports the same `HomePage` and `ProjectsPage` components and publish-safe data used by the browser. It exports a deterministic `renderPage(pageId)` that uses `renderToString` from `react-dom/server`.
- `src/entries/home.client.jsx` and `src/entries/projects.client.jsx` call `hydrateRoot` from `react-dom/client` **only on explicitly marked interactive islands**, such as the progressively enhanced navigation disclosure and Projects explorer/filter region. The complete page-level `#root` remains static and is not hydrated merely to reproduce non-interactive text. Client entries must not call `createRoot` on any pre-rendered mount.
- Each source HTML entry contains exactly one marker such as `<div id="root"><!--app-html--></div>`. `scripts/prerender.mjs` requires that marker exactly once, injects the matching server-rendered markup, and fails rather than emitting a partial page when a marker/page render is missing.
- Server and client initial renders use identical data, props, ordering, and initial state. Initial render code must not depend on `window`, random values, current time, browser locale, viewport width, or other nondeterministic inputs.
- Each island wrapper is server-rendered with a stable identifier and the exact same initial props/markup that its client entry passes to `hydrateRoot`. Browser-only enhancements are attached during/after hydration. Hydration warnings are test failures; `suppressHydrationWarning` must not conceal structural mismatches.
- The generated `dist/index.html` must already contain the site navigation, homepage `<h1>`, capabilities, three flagship projects, professional experience, selected work, skills, certifications, education, contact links, and footer before any client JavaScript runs.
- The generated `dist/projects/index.html` must already contain navigation, the Projects `<h1>`, introduction, every published project article and artifact link, contact links, and footer before any client JavaScript runs.

### Build sequence

The implementation may express these as separate npm scripts composed by `npm run build`, but the order is mandatory:

1. Validate schemas, privacy rules, links, and the featured-project contract.
2. Run the Vite client multi-page build into a clean `dist/`; the transformed HTML contains hashed CSS/client-module references and the single injection marker.
3. Run Vite in SSR build mode for `src/entries/server.jsx`, emitting a temporary ESM render bundle under ignored `.prerender/`. Configure a stable server-bundle filename rather than discovering it by an unsafe glob.
4. Run `node scripts/prerender.mjs`. It imports the temporary server bundle, calls `renderPage('home')` and `renderPage('projects')`, injects each result into the corresponding `dist` HTML file, and removes the injection comments.
5. Remove the temporary `.prerender/` output after successful injection. A failure leaves deployment blocked and must not upload `dist`.
6. Run `verify-dist.mjs`, no-JavaScript checks, and performance budgets against the completed pre-rendered artifact.

The server bundle is build tooling, not a deployed server. GitHub Pages still receives only static `dist/` files.

### Page behavior

- `<h1>`: “Projects”. Intro explains that entries focus on system design, research method, evaluation, and evidence.
- All published project summaries exist in the pre-rendered HTML. There is no pagination for the expected dataset size.
- Optional category filters are real buttons with `aria-pressed`; “All” is the default. They progressively hide/show already available cards.
- If filter state is shareable, use a query parameter such as `/projects/?category=agentic-ai`, never a hash route. Invalid values fall back to All.
- Project article IDs match stable project IDs. A fragment such as `#metamind-responsible-ai-learning-companion` is permitted only as an in-document anchor.
- An empty filter announces a helpful message in an `aria-live="polite"` region and provides “Clear filter”.
- Every card/article uses headings, plain lists, and real artifact links. No click-only card surface, “like” control, hover-only content, or modal.
- Unpublished records must not appear. Publication flags are not secrecy controls: no confidential information may exist in client-side data even when filtered out.
- Without JavaScript, all published project articles and links remain visible. Filtering is an enhancement: filter controls must be hidden unless they have a genuinely functional native fallback, while the unfiltered collection remains readable.
- Mobile navigation must work without hydration. Prefer a native `<details>/<summary>` disclosure or an always-visible wrapping navigation; do not server-render a collapsed menu whose links require JavaScript to become reachable.

Official Vite documentation confirms multiple HTML entry points and the root `base` setting, while React's server/client APIs provide rendering and hydration. This specification deliberately adds that React pre-render pipeline; it does not attribute pre-rendering to Vite multi-page mode. References are listed at the end.

## 4. Complete proposed repository file tree

```text
zaizou1003.github.io/
├── .github/
│   ├── workflows/
│   │   └── pages.yml                  # verify, build, artifact upload, Pages deploy
│   └── dependabot.yml                 # reviewed npm/Actions update proposals
├── .gitignore                         # ignores node_modules, dist, build, .prerender, coverage, env/private
├── .nvmrc                             # approved Node LTS line used locally and in CI
├── README.md                          # architecture, content rules, commands, deployment
├── package.json                       # React runtime; Vite/prerender and real quality scripts/dev tools
├── package-lock.json                  # committed npm lockfile
├── vite.config.js                     # React plugin, MPA/SSR builds, base '/', stable server output
├── index.html                         # Home template, metadata, mount/injection marker, client entry
├── projects/
│   └── index.html                     # Projects template, metadata, marker, client entry
├── public/
│   ├── 404.html                       # noindex, links to canonical resources; no redirect hack
│   ├── favicon.svg
│   ├── favicon.ico                    # only if an approved fallback is supplied
│   ├── apple-touch-icon.png
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── social/
│   │   ├── home-og.jpg                # 1200×630, approved, local
│   │   └── projects-og.jpg            # 1200×630, approved, local
│   └── images/
│       ├── profile/
│       │   ├── ahmed-480.avif
│       │   ├── ahmed-480.webp
│       │   └── ahmed-480.jpg
│       ├── projects/
│       │   ├── air-quality-agent-{480,800,1200}.{avif,webp,jpg}
│       │   ├── finrl-deepseek-{480,800,1200}.{avif,webp,jpg}
│       │   ├── metamind-{480,800,1200}.{avif,webp,jpg}
│       │   └── selected-work-*         # only approved optimized evidence images
│       └── organizations/              # optional approved local logos only
├── scripts/
│   ├── validate-content.mjs            # schema, privacy, featured-order, URL checks
│   ├── prerender.mjs                   # injects react-dom/server output into both built HTML files
│   ├── verify-dist.mjs                 # output, static-content, asset, source-map/private checks
│   └── check-budgets.mjs               # JS/CSS/image budgets
├── src/
│   ├── entries/
│   │   ├── home.client.jsx             # hydrateRoot for homepage enhancements
│   │   ├── projects.client.jsx         # hydrateRoot for project filters/enhancements
│   │   └── server.jsx                  # renderToString dispatcher for both pages
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── ProjectsPage.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── SkipLink.jsx
│   │   │   ├── SiteHeader.jsx
│   │   │   ├── SiteHeader.module.css
│   │   │   ├── SiteFooter.jsx
│   │   │   └── SiteFooter.module.css
│   │   ├── sections/
│   │   │   ├── Hero.jsx
│   │   │   ├── Capabilities.jsx
│   │   │   ├── FeaturedProjects.jsx
│   │   │   ├── Experience.jsx
│   │   │   ├── SelectedWork.jsx
│   │   │   ├── Skills.jsx
│   │   │   ├── Certifications.jsx
│   │   │   ├── Education.jsx
│   │   │   └── ContactLinks.jsx
│   │   ├── projects/
│   │   │   ├── FeaturedProjectCard.jsx
│   │   │   ├── ProjectArticle.jsx
│   │   │   ├── ProjectFilters.jsx
│   │   │   └── *.module.css
│   │   ├── experience/
│   │   │   ├── ExperienceItem.jsx
│   │   │   └── ExperienceItem.module.css
│   │   ├── content/
│   │   │   ├── SkillGroup.jsx
│   │   │   ├── CertificationCard.jsx
│   │   │   └── EducationItem.jsx
│   │   └── ui/
│   │       ├── InlineIcon.jsx
│   │       ├── LinkButton.jsx
│   │       ├── SectionHeading.jsx
│   │       └── TagList.jsx
│   ├── data/
│   │   ├── profile.js
│   │   ├── projects.js
│   │   ├── experience.js
│   │   ├── skills.js
│   │   ├── certifications.js
│   │   ├── education.js
│   │   ├── schemas.js                 # documented plain-JS contracts
│   │   ├── selectors.js               # published/featured ordering logic
│   │   └── index.js                   # explicit exports only
│   ├── icons/
│   │   ├── EmailIcon.jsx
│   │   ├── GitHubIcon.jsx
│   │   ├── LinkedInIcon.jsx
│   │   ├── ArrowIcon.jsx
│   │   └── ExternalLinkIcon.jsx
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   ├── utilities.css
│   │   └── pages.css
│   └── utils/
│       ├── dates.js
│       ├── urls.js
│       └── projectFilters.js
└── tests/
    ├── data/
    │   ├── schemas.test.js
    │   ├── featuredProjects.test.js
    │   └── privacyRules.test.js
    ├── components/
    │   ├── navigation.test.jsx
    │   ├── projects.test.jsx
    │   └── contactLinks.test.jsx
    ├── prerender/
    │   ├── staticHtml.test.js          # required content exists before JavaScript
    │   └── hydration.test.jsx          # server/client markup hydrates without mismatch
    └── e2e/
        ├── routes.spec.js
        ├── noJavaScript.spec.js
        ├── accessibility.spec.js
        └── responsive.spec.js
```

Brace notation in image filenames represents generated variants, not literal filenames. The implementation must create only variants actually used. No `CNAME` file is required in this Actions-based design; current GitHub documentation says Actions publishing ignores it. The custom domain is configured in repository Pages settings.

## 5. Component architecture

### Data flow

```text
plain local data modules
    → schema/content validation
    → pure selectors (published, featuredOrder, category)
    → shared page + semantic section/card components
    ├── react-dom/server renderToString → prerender.mjs → complete dist HTML
    └── matching client entry → hydrateRoot → optional interactive enhancement
```

- `server.jsx` is a build-time-only entry that renders both page components with `react-dom/server`; no server process is deployed.
- `home.client.jsx` and `projects.client.jsx` locate explicit interactive-island containers and hydrate those existing subtrees with `hydrateRoot`. Static headings, prose, cards outside an interactive island, experience, and contact content are not hydrated. Client code never replaces a populated mount with `createRoot`.
- `HomePage` composes the eleven locked sections in order.
- `ProjectsPage` composes the shared layout, filters, and project articles.
- Header, footer, cards, and content components receive data via props; they do not import a monolithic global object.
- No global state library. Local state is limited to mobile-navigation disclosure and optional project filter selection.
- No modal state. Project details are visible in semantic `<article>` content on `/projects/`.
- Selectors are deterministic pure functions and never mutate the source arrays.
- Metadata is static per HTML entry or injected at build time from publish-safe site metadata using a small local Vite HTML transform. No runtime Helmet package.
- Inline SVG components contain only curated local path data. Decorative SVG uses `aria-hidden="true"` and `focusable="false"`; meaningful links retain visible text.
- The static render is the content baseline. Hydration may add project filtering or progressive menu behavior, but it must not be responsible for making core headings, navigation, project/experience content, or contact links appear.
- The no-JavaScript baseline shows all published projects. If filter controls are present in the server markup, a root `no-js`/`js` enhancement class or equivalent CSS contract hides them until enhancement is available; an inert control set must not be presented as usable.

## 6. Structured data schemas

These are plain-JavaScript data contracts. `scripts/validate-content.mjs` and unit tests enforce them without a runtime schema library. All dates use ISO `YYYY-MM` or `YYYY-MM-DD`; display labels are derived.

### Shared types

```js
Link = {
  label: string,
  href: string,              // https: or approved mailto: only
  kind: 'email' | 'linkedin' | 'github' | 'repository' | 'demo' | 'paper' | 'credential'
}

Image = {
  src: string,
  srcSet?: string,
  sizes?: string,
  alt: string,               // empty only when genuinely decorative
  width: number,
  height: number
}

PublicationStatus = 'draft' | 'evidence-pending' | 'published' | 'withheld'
```

Every client-side record—even draft or withheld—must be safe to publish because Vite can expose bundled source. Truly private notes and employer details never enter `src/data`.

### Profile

```js
Profile = {
  name: 'Ahmed Aziz Ben Aissa',
  role: 'AI Systems Engineer',
  valueProposition: string,
  summary: string,
  focusAreas: string[],
  location?: string,         // only if owner explicitly approves a broad public location
  image?: Image,             // approved optimized portrait only
  links: {
    email: Link,
    linkedin: Link,
    github: Link
  }
}
```

Forbidden profile fields: telephone number, gender, nationality, birth date, street address, personal identifiers, service keys, or a raw CV path. JSON-LD is derived from the approved subset only.

### Projects

```js
Project = {
  id: string,                // stable lowercase kebab-case; never derived at render time
  title: string,
  summary: string,           // concise card summary
  detailedDescription: string[],
  role: string,              // exact personal contribution
  workMode: 'individual' | 'team',
  technologies: string[],    // verified technologies only
  categories: Array<
    'agentic-ai' |
    'mcp' |
    'rag' |
    'applied-research' |
    'responsible-ai' |
    'computer-vision' |
    'production-ai' |
    'data-systems'
  >,
  evidenceResults: Array<{
    label: string,
    value: string,
    method: string,
    sourceUrl?: string       // stable public evidence only
  }>,
  repositoryUrl: string | null,
  demoPaperUrl: string | null,
  image: Image,
  featuredOrder: 1 | 2 | 3 | null,
  publicationStatus: PublicationStatus
}
```

Project rules:

- `id` is immutable after publication and unique across the dataset.
- `featuredOrder` replaces `ontop`, `top`, `rank`, and other magic fields.
- Only `published` records render publicly.
- Exactly the three locked flagship records have `featuredOrder` 1–3.
- An individual project uses `workMode: 'individual'`; team records explain Ahmed's contribution in `role`.
- Evidence/result text states the method and does not imply causality or performance unsupported by a reproducible artifact.
- `repositoryUrl: null` renders no repository button. Never use a placeholder or private/employer URL.
- `demoPaperUrl` may represent one approved primary artifact. If separate demo and paper links are needed later, migrate to a typed `artifacts[]` array through a documented schema version.
- Signed/time-limited URLs, token-like query parameters, URL shorteners, and unapproved remote images fail validation.

Final featured records are content-gated as follows:

| `featuredOrder` | Stable ID | Title | Required truth constraints before `published` |
|---:|---|---|---|
| 1 | `european-air-quality-evidence-agent` | European Air-Quality Evidence Agent | `workMode: individual`; role states individual work by Ahmed; evidence covers agentic AI, MCP, RAG, validation, security, and evaluation without invented results |
| 2 | `finrl-deepseek-research-extension` | FinRL–DeepSeek Research Extension | Evidence documents reinforcement-learning/financial-research method, multiple seeds, reproducibility, and approved quantitative results |
| 3 | `metamind-responsible-ai-learning-companion` | MetaMind Responsible AI Learning Companion | Evidence documents the multi-agent design, learner-state persistence, Socratic guidance, and responsible-AI safeguards |

### Experience

```js
Experience = {
  id: string,
  employer: string,
  roleTitle: string,
  employmentType: 'apprenticeship' | 'internship' | 'employment',
  startDate: string,         // YYYY-MM
  endDate: string | null,    // null means present
  location?: string,
  summary: string,
  highlights: string[],
  capabilityRefs: string[],
  confidentialityNote?: string,
  employerUrl?: string,
  publicationStatus: PublicationStatus
}
```

Required records:

- Ayming: `startDate: '2025-10'`, `endDate: null`, type apprenticeship; exact role/highlights require approval.
- VroomVroom: `startDate: '2025-06'`, `endDate: '2025-08'`, role “AI Systems Engineer”, type internship.

Experience has no repository field. Public artifacts may be linked only from a separately approved project record that clearly identifies ownership and confidentiality boundaries.

### Skills

```js
SkillGroup = {
  id: string,
  title: string,
  description?: string,
  skills: Array<{
    name: string,
    evidenceProjectIds: string[],
    context?: string
  }>,
  displayOrder: number
}
```

Do not store numeric proficiency percentages. Every `evidenceProjectIds` value must resolve to a published project, or the skill needs separate owner-approved evidence.

### Certifications

```js
Certification = {
  id: string,
  title: string,
  issuer: string,
  issuedDate?: string,
  credentialUrl: string | null,
  image?: Image,
  featuredOrder: 1 | 2 | 3,
  publicationStatus: PublicationStatus
}
```

The validator fixes the three locked titles and order. Credential URLs must be stable issuer/verification pages with no signature or expiring authorization parameters. Images are optional and excluded until approved.

### Education

```js
Education = {
  id: string,
  institution: string,
  program: string,
  startDate: string,
  endDate: string | null,
  summary?: string,
  highlights?: string[],
  image?: Image,
  publicationStatus: PublicationStatus
}
```

Do not migrate grades, descriptions, or recovered logos unless explicitly approved and still relevant. Sort by `endDate`/`startDate`, not free-form display strings.

## 7. Featured-project selection contract

The selector is conceptually:

```js
export function selectFeaturedProjects(projects) {
  const featured = projects
    .filter((project) =>
      project.publicationStatus === 'published' &&
      Number.isInteger(project.featuredOrder)
    )
    .toSorted((a, b) => a.featuredOrder - b.featuredOrder);

  assertFeaturedContract(featured);
  return featured;
}
```

`assertFeaturedContract` checks count, orders, IDs, and exact title order. A contract failure stops validation/build and gives a filename/record-level error. The UI also has a defensive, visible fallback message for development, but production deployment must never proceed with an invalid featured set.

## 8. Design-system specification

### Visual direction

**Owner-approved direction:** use a restrained technical/editorial aesthetic with deep navy surfaces, high-contrast neutral text, a teal systems accent, a sky-blue link color, and a yellow focus ring. The colour tokens below are approved. Evidence and architecture should carry the page; decorative effects should not compete with content.

### Colour tokens

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#08111F` | Page background |
| `--color-surface` | `#101B2D` | Primary cards/sections |
| `--color-surface-raised` | `#17243A` | Raised/interactive cards |
| `--color-text` | `#F5F7FA` | Primary text |
| `--color-text-muted` | `#B7C3D4` | Secondary text |
| `--color-border` | `#2B3B52` | Dividers/card borders |
| `--color-accent` | `#5EEAD4` | Primary accent and button background |
| `--color-accent-ink` | `#062821` | Text on accent |
| `--color-link` | `#7DD3FC` | Inline links |
| `--color-focus` | `#FDE047` | Focus indication |
| `--color-danger` | `#FDA4AF` | Error text on dark surfaces |

Final implementation must measure contrast in all default, hover, focus, visited, disabled, and error states. Minimums: 4.5:1 for normal text, 3:1 for large text and non-text UI boundaries, with no information conveyed by colour alone.

### Typography

- Use a system stack to avoid font requests: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; Inter is used only if locally available, not downloaded.
- Monospace accents: `ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace`.
- Body: `clamp(1rem, 0.97rem + 0.15vw, 1.125rem)`; line-height 1.65.
- H1: `clamp(2.4rem, 1.8rem + 3vw, 5rem)`; line-height 1.05; maximum readable width.
- H2: `clamp(1.8rem, 1.5rem + 1.5vw, 3rem)`.
- H3: `clamp(1.25rem, 1.15rem + 0.5vw, 1.6rem)`.
- Paragraph measure: 65–72 characters; avoid centered multi-paragraph body copy.
- Do not use text smaller than `0.875rem` for essential content.

### Spacing and containers

- Base unit: 4 px.
- Token scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
- Page inline gutter: `clamp(1rem, 4vw, 2.5rem)`.
- Main content maximum: 1200 px; reading content maximum: 760 px.
- Section block spacing: `clamp(4rem, 8vw, 7rem)`.
- Grid gaps: 16 px small, 24 px standard, 32 px wide.

### Breakpoints

Mobile-first content determines layout; breakpoints are consolidation points, not device labels:

- `30rem` / 480 px
- `48rem` / 768 px
- `64rem` / 1024 px
- `80rem` / 1280 px

Avoid component-specific arbitrary breakpoints unless a demonstrated content collision requires one.

### Cards

- Use `<article>` or semantic list items, never a clickable `<div>`.
- Fluid width, no fixed height, no line clamp for essential content.
- 1 px border, 12–16 px radius, modest surface shift; no glassmorphism that reduces contrast.
- Whole-card hover effects are decorative only. The primary title link remains a visible, independently focusable link.
- Flagship cards may use two-column media/content layout above 768 px and single column below.

### Buttons and links

- Use `<a>` for navigation and `<button>` for state changes.
- Minimum pointer target 44×44 CSS px where practical; never below the WCAG 2.2 minimum.
- Primary button: teal background/dark text; secondary button: transparent with high-contrast border.
- Underline inline links by default. Do not rely on colour or icons alone.
- Avoid opening new tabs. If explicitly required, disclose it in accessible text and apply `rel="noopener noreferrer"`.

### Focus states

- Every interactive control uses a consistent `:focus-visible` ring: 3 px `--color-focus`, 3 px offset.
- Never remove outlines without an equivalent.
- Focus must not be obscured by the sticky header; use `scroll-margin-top` on anchor targets.

### Motion and reduced motion

- No typewriter, parallax, infinite rotation, canvas, autoplay, or attention-loop animation.
- Standard transitions are 120–200 ms and limited to colour/opacity/transform where safe.
- `@media (prefers-reduced-motion: reduce)` disables smooth scrolling and nonessential transition/animation.
- Functionality and state changes cannot depend on animation completion.

## 9. Responsive requirements: 320 px through wide desktop

| Viewport | Required behavior |
|---|---|
| 320–479 px | One column; 16 px gutters; no element wider than viewport; compact disclosure navigation; cards/media full width; filters wrap or use an accessible select; 44 px controls; no clipped headings or horizontal scroll. |
| 480–767 px | One-column content with increased gutters; capability/skill chips wrap; contact links stack or wrap; project image ratios remain stable. |
| 768–1023 px | Two-column capability/selected-work grids where content permits; flagship cards may alternate media/content; navigation can transition to desktop only when all labels fit. |
| 1024–1279 px | Full desktop navigation; two- or three-column supporting grids; experience maintains a readable text measure rather than stretching. |
| 1280 px and wider | Content remains within 1200 px; whitespace grows outside the container; no uncontrolled card stretching. |

Acceptance requirements at every size:

- Test 320, 360, 390, 768, 1024, 1280, 1440, and at least 1920 px.
- Test portrait/landscape, 200% browser zoom, and text-only enlargement.
- No horizontal document scrolling at 320 px or 400% zoom at a 1280 px viewport, except an explicitly scrollable code/data region.
- Navigation, filters, images, long technology names, and approved long project titles wrap without overlap.
- Images declare intrinsic dimensions; layout does not jump as they load.
- Touch behavior exposes the same content as hover/focus.

## 10. Accessibility acceptance criteria

Target WCAG 2.2 AA. Definition requires automated and manual evidence:

1. Each page has a skip link, `<header>`, labelled `<nav>`, one `<main id="main">`, logical sections, and `<footer>`.
2. Exactly one descriptive `<h1>` per page and a sequential heading outline.
3. All interactions are native links/buttons or fully equivalent; complete keyboard operation works with Tab, Shift+Tab, Enter, Space where applicable, and Escape for the mobile disclosure.
4. Focus is visible, not clipped/covered, and returns predictably when the mobile menu closes.
5. Mobile menu communicates name, expanded state, and controlled region.
6. Project filters communicate selected state and update an announced results count/empty state without moving focus unexpectedly.
7. Colour/graphical contrast meets the ratios in the design system in all states.
8. Informative images have concise contextual alt text; decorative graphics have empty alt or `aria-hidden`; no filename-based alt text.
9. SVG icons are not the sole accessible label. Decorative SVG is removed from the accessibility tree.
10. Page language is declared. Dates and abbreviations are readable; visible link text is meaningful out of context.
11. `prefers-reduced-motion` removes nonessential motion and smooth scrolling.
12. Content remains usable at 200% zoom and 400% reflow without loss or two-dimensional scrolling.
13. No hover-only or pointer-only information. Target sizes and spacing meet WCAG 2.2.
14. New-page navigation naturally resets document context; each page has a unique title. Anchor navigation positions headings below the sticky header.
15. Automated axe checks report zero serious/critical violations on `/` and `/projects/`; static linting includes JSX accessibility rules.
16. Manual keyboard review passes in current Chromium and Firefox. One manual screen-reader pass is recorded with NVDA/Firefox or VoiceOver/Safari.
17. With JavaScript disabled, both pages retain their landmarks, heading structure, navigation, project/experience content, and contact links. Mobile navigation remains operable through native HTML or is fully visible, and Projects falls back to the complete unfiltered list.

## 11. SEO and social metadata strategy

### Per-page metadata

Home:

- Title pattern: `Ahmed Aziz Ben Aissa — AI Systems Engineer`.
- Canonical: `https://ahmedazizbenaissa.me/`.
- Description: concise, owner-approved summary covering agentic AI, MCP, retrieval, responsible AI, applied research, and production reliability.
- Local Open Graph/Twitter image: `/social/home-og.jpg`.

Projects:

- Title pattern: `AI Systems Projects — Ahmed Aziz Ben Aissa`.
- Canonical: `https://ahmedazizbenaissa.me/projects/`.
- Description: evidence-led project collection description.
- Local Open Graph/Twitter image: `/social/projects-og.jpg`.

Both HTML entries include charset, viewport, theme colour, favicon links, `og:type=website`, canonical URL, Open Graph URL/title/description/image, and Twitter card metadata. Do not use meta keywords, placeholder domains, GitHub profile URLs as canonicals, remote images, or runtime-only metadata.

Both **generated** HTML entries must also contain their complete semantic page bodies at build time. Search/social/crawl quality must not depend on a crawler executing the hydration bundle. `dist/index.html` must expose the owner heading, navigation, capability headings, featured project titles, experience employers, certification/education headings, and contact-link labels as ordinary HTML text. `dist/projects/index.html` must expose its page heading and every published project title, summary, evidence text, and public artifact link. Hydration is an enhancement, not the SEO content source.

`verify-dist.mjs` parses or structurally inspects both files after prerendering. A mere `<div id="root"></div>`, a mount containing only whitespace/comment markers, missing required landmark/headings, or missing locked project/experience/contact text is a build failure. String byte-size alone is not sufficient verification.

### Structured data

Use minimal valid JSON-LD:

- Home: `Person` with only `name`, `url`, `jobTitle`, short `description`, and approved `sameAs` links for LinkedIn/GitHub; optionally `knowsAbout` using the seven public focus areas.
- Site: `WebSite` with canonical name and URL.
- Projects page: `CollectionPage` with canonical URL and a publish-safe item list only if validation confirms every referenced project.

Explicitly omit telephone, email from JSON-LD unless the owner later approves it, gender, nationality, street address, birth date, private education details, and unverified employer/project claims.

### Crawl files

- `robots.txt` allows crawling and points to `https://ahmedazizbenaissa.me/sitemap.xml`.
- Sitemap is valid XML containing only `/` and `/projects/`, with no hash URLs or invented modification dates.
- `404.html` includes `noindex` and no obsolete redirect.
- Validate HTML, JSON-LD, Open Graph image dimensions, robots, sitemap, and canonical uniqueness before deployment.

## 12. Canonical-domain and GitHub Pages strategy

1. Set Vite `base: '/'`; the custom domain is a root path deployment.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.
3. Configure `ahmedazizbenaissa.me` as the custom domain in Pages settings and enable HTTPS after DNS is valid.
4. Configure the apex DNS using the provider-supported GitHub Pages A/AAAA or ALIAS/ANAME approach. Optionally configure `www` to point directly to the GitHub Pages default host so GitHub can redirect it to the configured apex. Verify against current GitHub documentation at implementation time.
5. Do not depend on root/public/artifact `CNAME` files. GitHub's current documentation states that custom Actions workflows ignore them and store the custom-domain setting externally.
6. Normal site links are root-relative: `/`, `/projects/`, `/images/...`. Do not reintroduce `/zaizou1003.github.io/` or `/portfolio-react/` prefixes.
7. Verify that `https://zaizou1003.github.io/` redirects to the canonical custom domain, both canonical URLs return 200, HTTPS is enforced, and `/projects/` works on direct request and refresh.
8. Do not use an SPA 404 redirect. Unknown paths return the static branded 404 page.

DNS, Pages settings, and certificate status are external state and require an owner-authorized verification step; this specification does not change them.

## 13. GitHub Actions deployment design

Use one workflow, `.github/workflows/pages.yml`, with verification on pull requests and deployment only after a verified push to `main`.

### Triggers and permissions

- `pull_request`: run checks/build; never deploy.
- `push` to `main`: run the same checks, upload `dist`, then deploy.
- `workflow_dispatch`: optional owner-controlled rerun.
- Default/job permissions are least privilege: build gets `contents: read`; deploy gets `pages: write` and `id-token: write`.
- Deployment job uses protected environment `github-pages` and `needs: build`.
- Concurrency group `pages`; cancel superseded in-progress deployments.
- No `pull_request_target`, personal access token, Firebase secret, or deployment branch push.

### Build job

1. Checkout source.
2. Set up the `.nvmrc` Node LTS with npm cache keyed by `package-lock.json`.
3. `npm ci`.
4. `npm run validate:content`.
5. `npm run lint`.
6. `npm run test:run`.
7. `npm run build`, which must run the ordered client MPA build, temporary Vite SSR build, `scripts/prerender.mjs`, and temporary-render-bundle cleanup described in section 3.
8. `npm run verify:dist`; this must fail on an empty/marker-only React mount, missing required static content, hydration-entry mismatch, or residual prerender marker. Then run `npm run check:budgets`.
9. Run JavaScript-enabled and JavaScript-disabled route/accessibility smoke tests against the completed static preview.
10. Inspect the artifact manifest for `.prerender`, source maps, private/recovery material, and unexpected server bundles; any match blocks upload.
11. On a `main` push only, configure Pages and upload `./dist` as the `github-pages` artifact.

### Deploy job

- Run only on a successful `main` build.
- Use `actions/deploy-pages` to deploy the uploaded artifact through GitHub's OIDC-backed Pages flow.
- Surface `${{ steps.deployment.outputs.page_url }}` as the environment URL.
- Never commit or push `dist/` or update a `gh-pages` branch.

At implementation time, use the current official Actions majors or, preferably, immutable reviewed commit SHAs. The official Vite sample checked on 2026-08-10 used Checkout v7, Setup Node v6, Configure Pages v6, Upload Pages Artifact v5, and Deploy Pages v5. Pinning must be reviewed rather than copied blindly, and Dependabot Action updates require human approval.

## 14. Image optimization strategy

- Treat screenshots as evidence: crop around the system/result being discussed and add a useful caption.
- Generate AVIF and WebP plus JPEG/PNG fallback. Use `<picture>` with 480, 800, and at most 1200 px variants only where layout needs them.
- Project images: target ≤160 KB for the largest normally loaded variant; social cards ≤300 KB; portrait ≤120 KB; inline logos/icons preferably SVG and ≤10 KB.
- Declare `width`, `height`, `srcset`, and `sizes`; reserve aspect ratio in CSS.
- Hero/LCP image, if retained, is eager and may use `fetchpriority="high"`; all below-fold project/education images use `loading="lazy"` and `decoding="async"`.
- Never lazy-load an above-fold LCP image.
- Store public optimized assets under `public/images`; keep original high-resolution/private source material outside the published repository or in an explicitly ignored private workspace.
- Strip EXIF/GPS/device metadata from approved personal images.
- Inspect screenshots for tokens, signed URLs, private datasets, employer/client identifiers, notifications, and personal information before commit.
- Do not migrate the 89 MB GLB or any MyMind asset. Do not use the large View All image; use a text link/card.
- Certification cards are text-first. Recovered certificate images remain excluded until an explicit privacy/credential-ID/QR review approves a replacement.
- Alt text describes the meaningful visual evidence, not the project title alone. Decorative images use empty alt.

## 15. Testing strategy

Testing packages are dev-only and are added only together with real tests. Recommended tools are Vitest, Testing Library/Jest DOM/User Event for component behavior, jsdom, Playwright for route/responsive tests, `@axe-core/playwright` or equivalent axe integration, and ESLint with React Hooks and JSX accessibility rules. Exact versions are selected and locked during the approved implementation, not by this document.

### Data and unit tests

- Unique stable IDs across every collection.
- Exact three featured titles and unique order `[1, 2, 3]`.
- Only `published` records reach public selectors.
- LiveCoach/System Dynamics remain excluded until their evidence status changes through an approved data edit.
- Experience ordering and ISO date parsing; Ayming present from 2025-10 and VroomVroom from 2025-06 through 2025-08.
- Required certification title/order contract.
- Every evidence project reference resolves.
- URLs use permitted schemes/hosts and reject signature/token-like parameters.
- Data contracts contain no forbidden personal fields or service-credential keys.

### Component tests

- Skip link and landmark/heading structure.
- Mobile navigation name/state/Escape/focus behavior.
- Featured cards render in locked order with role/work-mode labels.
- Project filters are keyboard-operable, expose selected state, and announce empty/results states.
- Missing repository/demo links render no empty anchor.
- Contact contains exactly Email, LinkedIn, and GitHub links and no form/telephone.
- Inline SVG accessibility behavior and external-link rel behavior.
- `renderPage('home')` and `renderPage('projects')` return complete deterministic markup containing the required landmarks/content.
- Server markup and the corresponding client entry hydrate with zero recoverable hydration errors or DOM-replacement warnings.

### End-to-end and manual tests

- Direct load and refresh of `/` and `/projects/` return usable pages; no hash router or fallback redirect.
- With JavaScript disabled, both direct URLs retain all core content and links; Projects shows all published records; mobile navigation remains usable without a client event handler.
- Homepage anchors and project article fragments focus/position content correctly.
- Keyboard-only completion of navigation and project filtering.
- Automated axe checks on both pages and representative filter states.
- Responsive matrix in section 9 plus reduced-motion emulation, dark/high-contrast modes where supported, and slow-network image behavior.
- Verify no horizontal overflow and no content available only on hover.
- Manual Chromium/Firefox, keyboard, and one screen-reader pass.

### Build and performance checks

- Clean `npm ci`, lint, unit/component tests, production build, dist verification, and audits.
- `dist/index.html` and `dist/projects/index.html` exist, every referenced asset exists, and no `<!--app-html-->` or temporary prerender marker remains.
- Parse both generated documents with JavaScript disabled. Assert a non-empty populated `#root`, one `<main>`, the expected `<h1>`, navigation links, homepage flagship/experience/contact text, and every published Projects article/link.
- Explicitly fail when `#root` is absent, empty, whitespace-only, comment-only, or contains only a loading shell/spinner. A hydration script reference does not satisfy static-render verification.
- Verify that the client bundles use `hydrateRoot` and that automated browser runs emit no hydration mismatch/recoverable error.
- No source map, GLB, Firebase/EmailJS identifier, CV, certificate recovery image, signed URL, environment file, or private directory appears in `dist`.
- Initial JavaScript target: ≤100 KiB gzip per page; CSS ≤30 KiB gzip; no single normally loaded image exceeds its budget.
- Lighthouse targets under stable test conditions: Accessibility 100, Best Practices ≥95, SEO ≥95, mobile Performance ≥90. Treat regressions as review blockers, not absolute field-performance claims.
- Lab targets: LCP ≤2.5 s, CLS ≤0.1, and low main-thread blocking on a representative mobile profile.

## 16. Security and privacy constraints

1. The site is static and has no backend, database, analytics, form processor, cookies, local persistence, or service worker.
2. No real environment variable is required for production. `.env*` remains ignored and `.env.example`, if ever added, contains names/placeholders only.
3. No recovered raw `data.js`, CV, certificate image, signed URL, EmailJS identifier, Firebase value, or personal telephone value is copied into public source.
4. No employer/client code, screenshots, architecture details, metrics, or links are published without authorization. VroomVroom remains experience, not a personal/open-source project.
5. Client-side status flags are not access controls. Do not store confidential draft content in any imported file.
6. URLs are `https:` except the one approved `mailto:`. Validate protocols and reject `javascript:`, data URLs for content, URL shorteners, signed/expiring authorization parameters, and tracking query strings.
7. Avoid `dangerouslySetInnerHTML`; content is data rendered as text. JSON-LD is serialized from a strict public allowlist and escapes unsafe characters.
8. Local SVG path data is code-reviewed; no arbitrary downloaded SVG/HTML is injected.
9. Vite production source maps are disabled. Deployment artifacts and CI logs are checked for private filenames/patterns.
10. The server/prerender bundle is temporary build output, uses the same publish-safe data allowlist, is never uploaded, and is removed after successful rendering. Do not serialize private data or a broad application-state dump into the HTML for hydration.
11. Commit `package-lock.json`; CI installs with `npm ci`. Run `npm audit --json` and `npm audit --omit=dev --json` as review evidence after the new lockfile exists. Do not use blind audit fixes.
12. Actions use least privilege, current reviewed immutable SHAs where practical, no untrusted privileged trigger, and the protected `github-pages` environment.
13. GitHub Pages cannot supply arbitrary application response headers. Use clean same-origin assets and no third-party scripts; evaluate a compatible CSP meta policy only after verifying it does not block hashed Vite modules or JSON-LD. Do not claim header protections Pages cannot set.
14. Strip image metadata and verify public contact/address choices before staging.
15. Run a secret/privacy scan on the exact intended diff and built artifact before any commit/deploy approval.

## 17. Migration plan from the current repository

### Preserve the current user-owned state

- Do not reset, restore, delete, overwrite, or stage the present dirty worktree. Recovery changes, generated build changes, reports, recovered files, and lockfile are user-owned.
- Before implementation, the owner must decide how the existing reports and approved recovery policy are preserved. Create the redesign branch/worktree only through a separately authorized Git operation.
- Prefer a clean sibling Git worktree for the rebuild so unapproved recovery assets remain untouched in the current directory.

### Content migration policy

- Do not import raw `src/utils/data.js`. Re-enter only the locked facts and separately verified public facts into the new schemas.
- Do not copy the recovered CV or certificate images. Start with no CV download and text-only certifications.
- Review every project, employment, education, contact, and artifact value with the owner. Record missing values as content blockers outside client data—not as public placeholders.
- Create the three flagship records first. Deployment is blocked until their roles/evidence/publication statuses pass validation.

### Technical replacement sequence

1. Scaffold the Vite MPA, client hydration entries, server render entry, prerender script, and shared CSS/data architecture in the authorized clean worktree.
2. Build the new pages without importing legacy components. This is a clean rebuild, not an incremental styled-components conversion.
3. Add validated publish-safe data and optimized replacement assets.
4. Implement the ordered client-build → SSR-build → `renderToString` injection → static verification pipeline. Prove both generated HTML files contain complete content before enabling browser JavaScript.
5. Add hydration, no-JavaScript, accessibility, and content tests; make both entries render and hydrate successfully.
6. Add the Pages workflow and validate the pre-rendered artifact without deploying from a feature branch.
7. In the redesign branch only, remove obsolete CRA source/config and dependencies after the replacement has parity.

Expected legacy removals in that future authorized branch include:

- `src/FirebaseConfig.js`, all `src/components/mind/**`, `src/pages/FuturisticMind.jsx`, legacy router/modal/contact/PWA components, styled-component files, old theme modules, and the monolithic recovered data import path.
- `public/models/brain.glb`, root duplicate model, obsolete manifest, bad redirect, invalid sitemap, stale metadata/assets, and MyMind/PWA icons.
- CRA, Firebase, Three/Drei/Fiber, MUI/Emotion, styled-components, Tailwind, both EmailJS packages, icon catalogues, lodash, React Router/Scroll/Helmet, Typewriter, gh-pages, Web Vitals, Vercel Speed Insights, and stale CRA/Babel/test dependencies.
- Tracked `build/**` from the source branch. `dist/**` and `build/**` remain ignored; workflow artifacts are deployment-only.

Every deletion/removal above is a future reviewed migration action, not authorization in this specification task. Preserve Git history; do not use destructive reset/checkout operations.

### Dependency migration

- The intended runtime set is `react` and `react-dom` only.
- Core build dev dependencies are `vite` and `@vitejs/plugin-react`.
- Static rendering uses the `react-dom/server` export already supplied by React DOM; hydration uses `react-dom/client`. No separate runtime server or third-party prerender framework/plugin is part of the baseline.
- Quality/test dependencies are dev-only and justified by real scripts/tests.
- GitHub Actions replaces `gh-pages`; there is no deploy npm package.
- Generate a fresh npm lockfile only in the authorized implementation, review the complete manifest/lock diff, and verify a clean `npm ci`.

## 18. Exact implementation milestones

| Milestone | Exact scope | Exit criteria |
|---|---|---|
| 0. Owner gates and clean workspace | Approve public email/social URLs, Ayming title/details, VroomVroom wording, flagship evidence/artifacts, education facts, and image rights; create authorized redesign worktree | No private recovery material copied; current worktree fingerprint/status preserved |
| 1. Vite MPA and prerender foundation | New `package.json`/lock, `.nvmrc`, `vite.config.js`, two HTML templates, two hydration entries, shared server entry, `scripts/prerender.mjs`, page components, base/global CSS, `.gitignore` | Ordered client/SSR/prerender build succeeds; both dist files contain non-empty server-rendered headings/landmarks; hydration smoke test passes; no router/plugin framework |
| 2. Schemas and content validation | `src/data/**`, selectors, validation script, data tests | Exact featured contract passes; forbidden/private fields and unsafe URLs fail tests; only approved facts present |
| 3. Design tokens and accessible shell | Tokens/global/utilities, skip link, header/nav/mobile disclosure, footer, shared UI primitives, curated SVG | Keyboard/focus/landmark tests pass at 320 px and desktop; no external icons/styling runtime |
| 4. Homepage narrative | Hero, capabilities, flagship, experience, selected work, skills, certifications, education, contact in locked order | Content review passes; exactly three flagship cards; Ayming/VroomVroom correctly classified; three contact links only; all are present in pre-rendered `dist/index.html` |
| 5. Real Projects page | `/projects/` entry, published project articles, progressively enhanced filters, deep anchors | Direct load/refresh works locally; static HTML contains every published article; no-JavaScript view shows all; query filter degrades safely; no hash routing/modal |
| 6. Approved optimized assets | Local image variants, intrinsic dimensions, alt text, social images, favicons | Image/private-data review passes; budgets pass; no GLB/CV/recovered certificate imagery |
| 7. Metadata and crawlability | Per-page titles/descriptions/canonicals/OG, minimal JSON-LD, robots, sitemap, 404, pre-rendered semantic bodies | HTML/JSON-LD/XML/static-body validation passes; empty mount test fails as designed; only canonical domain; 404 has no redirect |
| 8. Quality suite | Lint/a11y rules, unit/component/server-render/hydration tests, Playwright enabled/disabled-JS route/responsive/axe checks, dist and budget scripts | All checks green; no hydration warning; no-JavaScript core-content/navigation pass; manual keyboard and one screen-reader review recorded |
| 9. Actions deployment design | `.github/workflows/pages.yml`, ordered prerender build, static-body artifact gate, Pages path/permissions/concurrency/environment; Dependabot policy | PR run verifies without deploy; empty mount blocks artifact upload; reviewed main artifact contains only complete pre-rendered `dist`; source branch contains no generated output |
| 10. Legacy removal and dependency pruning | Remove obsolete legacy source/assets/build tracking/dependencies in redesign branch; fresh lockfile | No forbidden package/import/path; clean `npm ci`; audits reviewed; build/test/budgets remain green |
| 11. Domain and release verification | Configure Pages source/custom apex/HTTPS/DNS under owner authorization; deploy only after separate approval | `/` and `/projects/` return 200 on canonical HTTPS; default host redirects; canonicals/social images/sitemap/404 verified live |

Milestones should be separate reviewable commits or pull-request checkpoints. Do not mix raw recovery assets into any redesign commit.

## 19. Verification checklist

### Content and positioning

- [ ] Name and role are exactly “Ahmed Aziz Ben Aissa” and “AI Systems Engineer”.
- [ ] Seven focus areas are represented without unsupported claims.
- [ ] Featured projects are exactly the locked three in order 1–3.
- [ ] European Air-Quality project is explicitly individual work by Ahmed.
- [ ] FinRL–DeepSeek describes multi-seed reproducible research with only verified results.
- [ ] MetaMind describes multi-agent learning, persistent learner state, Socratic guidance, and responsible-AI controls accurately.
- [ ] Ayming appears as apprenticeship from October 2025 to present with approved title/details.
- [ ] VroomVroom appears as AI Systems Engineer internship from June through August 2025, not as a personal project.
- [ ] No employer code is implied public.
- [ ] LiveCoach and System Dynamics appear only after their respective evidence/evaluation gates.
- [ ] Certifications contain the exact three locked titles/order and stable links only.
- [ ] Contact provides Email, LinkedIn, and GitHub only.

### Architecture and dependencies

- [ ] Runtime dependencies are React and React DOM only.
- [ ] Vite/React plugin build both HTML entries with `base: '/'`; Vite MPA is not treated as a prerenderer.
- [ ] The build uses `react-dom/server` `renderToString` through a local server entry and `scripts/prerender.mjs`, with no third-party prerender framework/plugin.
- [ ] Browser entries use `hydrateRoot`, not `createRoot`, and hydrate without mismatches.
- [ ] `dist/index.html` contains the complete homepage navigation, headings, featured projects, experience, and contact information before JavaScript executes.
- [ ] `dist/projects/index.html` contains the Projects heading, every published project/article link, navigation, and contact information before JavaScript executes.
- [ ] Empty, whitespace-only, comment-only, loading-only, or marker-only React mounts fail dist verification.
- [ ] No React Router/hash route; `/projects/` is a real emitted resource.
- [ ] No Firebase, Three/MyMind/GLB, MUI/Emotion, styled-components, Tailwind, EmailJS/form, PWA, icon catalogue, lodash, CRA, or `gh-pages` code/dependency remains.
- [ ] Local structured modules replace raw `data.js`; schemas/selectors are tested.
- [ ] No `build/` or `dist/` file is tracked/staged.

### Accessibility and responsive design

- [ ] WCAG 2.2 AA acceptance criteria in section 10 pass.
- [ ] Keyboard, focus, menu, filters, anchors, reduced motion, contrast, alt text, zoom/reflow, and target sizes are verified.
- [ ] With JavaScript disabled, core content/links remain readable, all projects remain visible, and mobile navigation remains accessible.
- [ ] 320–1920 px matrix passes with no unintended horizontal scroll or clipped content.
- [ ] Automated axe has no serious/critical findings; manual screen-reader evidence exists.

### SEO, domain, and deployment

- [ ] Both pages have unique static metadata, canonical URLs, and local 1200×630 social images.
- [ ] Both generated HTML bodies contain crawlable semantic content and required text without executing the hydration bundles.
- [ ] JSON-LD is valid/minimal and contains no forbidden personal fields.
- [ ] Robots, sitemap, and static 404 validate.
- [ ] Pages source is GitHub Actions; workflow uses least privilege and reviewed pinned actions.
- [ ] Artifact is `dist`, not a committed folder or deployment branch.
- [ ] CI completes client build, temporary SSR build, prerender injection, marker/empty-mount checks, hydration/no-JavaScript tests, and only then uploads the artifact.
- [ ] Custom apex and HTTPS are configured in Pages settings/DNS; no CNAME-file dependency.
- [ ] Canonical live `/` and `/projects/` return 200 and default host redirects correctly.

### Security, privacy, and quality

- [ ] No signed URLs, tokens, service identifiers, telephone, gender, nationality, CV, private certificate images, EXIF location, or employer/client private material exists in source, Git diff, logs, or artifact.
- [ ] Links pass protocol/stability checks and missing artifacts do not render placeholder buttons.
- [ ] `npm ci`, lint, validation, tests, build, dist verification, budgets, and both audit modes complete and are reviewed.
- [ ] Source maps are absent; package lock is committed; environment/private paths are ignored.
- [ ] Performance and image budgets pass under recorded conditions.

## 20. Definition of done

The redesign is done only when all of the following are true:

1. A clean clone installs deterministically with `npm ci`, passes all approved checks, and builds both real HTML resources with Vite plus the required React DOM Server prerender step.
2. The homepage follows the eleven required sections and communicates the AI Systems Engineer positioning through verified evidence.
3. Exactly the three locked flagship projects render in the required order, with accurate role/team status and no invented result/link.
4. `/projects/` is a real direct-loadable static page, not a hash route or SPA 404 workaround; its complete published project content exists in HTML before JavaScript executes.
5. Ayming and VroomVroom are accurate professional-experience entries; employer source code is neither published nor implied public.
6. The dependency/source graph contains none of the prohibited legacy systems and keeps generated output out of source control.
7. Both pages render complete semantic HTML through `react-dom/server`, hydrate only their interactive enhancements with `hydrateRoot` and no mismatch, and retain core navigation/content/contact functionality with JavaScript disabled.
8. WCAG 2.2 AA, responsive/reflow, keyboard, reduced-motion, screen-reader, no-JavaScript, SEO, metadata, privacy, security, and performance acceptance evidence is recorded.
9. The GitHub Actions workflow builds from the committed lockfile, blocks empty/non-prerendered mounts, deploys only a verified pre-rendered `dist` artifact from `main`, and uses least privilege.
10. `https://ahmedazizbenaissa.me/` is the single HTTPS canonical origin; `/projects/`, sitemap, social images, and 404 behavior work live.
11. No raw recovery data, unapproved CV/certificate material, signed/private values, employer code, generated build output, or unrelated user-owned working-tree change is included.
12. The owner has reviewed the final content, links, screenshots, privacy surface, Git diff, workflow result, and live site.

Deployment is a separate owner-approved action after these criteria pass; completing implementation does not itself authorize deployment.

## Current official references checked for this specification

- [Vite: Getting Started and multi-page support](https://vite.dev/guide/)
- [Vite: Building for Production — Multi-Page App](https://vite.dev/guide/build.html#multi-page-app)
- [Vite: Deploying a Static Site to GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)
- [Vite: `base` and `publicDir` configuration](https://vite.dev/config/shared-options.html)
- [React: `renderToString` server API](https://react.dev/reference/react-dom/server/renderToString)
- [React: `hydrateRoot` client API](https://react.dev/reference/react-dom/client/hydrateRoot)
- [GitHub Docs: Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Docs: Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Docs: Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

These services and action versions evolve. Recheck the official sources and pin reviewed current action commits at implementation time.
