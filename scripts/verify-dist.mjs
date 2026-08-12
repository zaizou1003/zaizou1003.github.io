import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrimaryNavigationItems } from '../src/components/layout/navigation.js';
import { capabilities } from '../src/data/capabilities.js';
import { certifications } from '../src/data/certifications.js';
import { education } from '../src/data/education.js';
import { experience } from '../src/data/experience.js';
import { profile } from '../src/data/profile.js';
import { projects } from '../src/data/projects.js';
import { assertSafeUrl } from '../src/data/schemas.js';
import {
  selectCapabilities,
  selectFeaturedCertifications,
  selectFeaturedProjects,
  selectPublishedEducation,
  selectPublishedExperience,
  selectPublishedSkillGroups,
} from '../src/data/selectors.js';
import { skills } from '../src/data/skills.js';
import { formatMonthRange, formatMonthYear, formatYearRange } from '../src/utils/dates.js';
import { inspectArtifactText } from '../src/validation/privacy.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const defaultDistDirectory = resolve(repositoryRoot, 'dist');

export const ROOT_END_SENTINEL = '<!--app-root-end-->';

export const DEFAULT_PAGE_CONTRACTS = Object.freeze([
  { id: 'home', relativeFile: 'index.html', heading: 'Ahmed Aziz Ben Aissa' },
  { id: 'projects', relativeFile: 'projects/index.html', heading: 'Projects' },
]);

export const HOME_SECTION_ORDER = Object.freeze([
  'hero',
  'capabilities',
  'featured-projects',
  'experience',
  'selected-work',
  'skills',
  'certifications',
  'education',
  'contact',
]);

const ALLOWED_ARTIFACT_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.html',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.png',
  '.svg',
  '.txt',
  '.webp',
  '.xml',
]);
const TEXT_ARTIFACT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);
const SVG_PATH_DATA_PATTERN = /^[AaCcHhLlMmQqSsTtVvZzEe0-9+.,\s-]+$/;
const FORBIDDEN_FILENAME_FRAGMENTS = [
  '.env',
  'certificate',
  'curriculum-vitae',
  'private',
  'recovery',
  'resume',
];

function countMatches(source, expression) {
  return source.match(expression)?.length ?? 0;
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertExactCount(source, expression, expected, message) {
  const count = countMatches(source, expression);
  if (count !== expected) throw new Error(`${message}; found ${count}.`);
}

function assertOrderedAttribute(source, attribute, expectedValues, message) {
  const expression = new RegExp(`\\b${attribute}="([^"]+)"`, 'gi');
  const actualValues = [...source.matchAll(expression)].map((match) => match[1]);
  if (JSON.stringify(actualValues) !== JSON.stringify(expectedValues)) {
    throw new Error(`${message}; found ${actualValues.join(', ') || 'none'}.`);
  }
}

function assertContainsAll(source, expectedValues, message) {
  const missing = expectedValues.filter((value) => !source.includes(value));
  if (missing.length > 0) {
    throw new Error(`${message}; ${missing.length} approved value(s) are missing.`);
  }
}

function findArticleByAttribute(source, attribute, value) {
  return source.match(
    new RegExp(
      `<article\\b(?=[^>]*\\b${attribute}="${escapePattern(value)}")[^>]*>[\\s\\S]*?<\\/article>`,
      'i',
    ),
  )?.[0];
}

function visibleText(markup) {
  return markup
    .replaceAll(/<!--[\s\S]*?-->/g, '')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function findMatchingRootClose(html, contentStart, file) {
  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = contentStart;
  let depth = 1;
  let match;
  while ((match = tagPattern.exec(html))) {
    const tag = match[0];
    if (/^<\/div/i.test(tag)) {
      depth -= 1;
      if (depth === 0) return { start: match.index, end: tagPattern.lastIndex };
    } else if (!/\/>$/.test(tag)) {
      depth += 1;
    }
  }
  throw new Error(`${file} has an unclosed #root boundary.`);
}

export function extractRootMarkup(html, file = 'HTML document') {
  const rootOpenings = [...html.matchAll(/<div\b[^>]*\bid\s*=\s*(["'])root\1[^>]*>/gi)];
  if (rootOpenings.length !== 1) {
    throw new Error(`${file} must contain exactly one #root opening; found ${rootOpenings.length}.`);
  }
  const sentinelCount = html.split(ROOT_END_SENTINEL).length - 1;
  if (sentinelCount !== 1) {
    throw new Error(`${file} must contain exactly one root-end boundary; found ${sentinelCount}.`);
  }

  const opening = rootOpenings[0];
  const contentStart = opening.index + opening[0].length;
  const closing = findMatchingRootClose(html, contentStart, file);
  const sentinelIndex = html.indexOf(ROOT_END_SENTINEL);
  const bodyClosingIndex = html.indexOf('</body>', closing.end);
  if (sentinelIndex < closing.end || bodyClosingIndex === -1 || sentinelIndex > bodyClosingIndex) {
    throw new Error(`${file} root-end boundary must immediately follow the matching #root close inside body.`);
  }
  if (html.slice(closing.end, sentinelIndex).trim() !== '') {
    throw new Error(`${file} contains content outside #root before its root-end boundary.`);
  }

  return html.slice(contentStart, closing.start);
}

export function assertHomeNarrative(rootMarkup, file = 'index.html') {
  assertOrderedAttribute(
    rootMarkup,
    'data-home-section',
    HOME_SECTION_ORDER,
    `${file} must preserve the exact homepage section order`,
  );
  for (const sectionId of HOME_SECTION_ORDER.slice(1)) {
    assertExactCount(
      rootMarkup,
      new RegExp(`<section\\b(?=[^>]*\\bid="${escapePattern(sectionId)}")[^>]*>`, 'gi'),
      1,
      `${file} must contain one stable #${sectionId} section`,
    );
  }
  if (
    !rootMarkup.includes(profile.valueProposition) ||
    !rootMarkup.includes(profile.role) ||
    !rootMarkup.includes(profile.summary)
  ) {
    throw new Error(`${file} is missing the approved homepage role or narrative.`);
  }
  assertExactCount(rootMarkup, /<img(?:\s|>)/gi, 0, `${file} must remain text-first in Milestone 4`);

  for (const [, href] of rootMarkup.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)) {
    if (/^(?:https:|mailto:)/i.test(href)) {
      assertSafeUrl(href, `${file} rendered link`, { allowMailto: href.startsWith('mailto:') });
    }
  }

  const publishedFeatured = selectFeaturedProjects(projects);
  assertOrderedAttribute(
    rootMarkup,
    'data-featured-project-id',
    publishedFeatured.map((project) => project.id),
    `${file} must render the exact published flagship order`,
  );
  for (const project of publishedFeatured) {
    const article = findArticleByAttribute(rootMarkup, 'data-featured-project-id', project.id);
    if (!article) throw new Error(`${file} is missing the ${project.id} flagship article.`);
    if (!new RegExp(`<h3(?:\\s[^>]*)?>${escapePattern(project.title)}<\\/h3>`, 'i').test(article)) {
      throw new Error(`${file} has a title mismatch for flagship ${project.id}.`);
    }
    if (!new RegExp(`\\bdata-work-mode="${project.workMode}"`, 'i').test(article)) {
      throw new Error(`${file} is missing the work-mode contract for ${project.id}.`);
    }
    const evidenceList = article.match(
      /<ul\b[^>]*\bdata-project-evidence=""[^>]*>([\s\S]*?)<\/ul>/i,
    )?.[1];
    const evidenceCount = evidenceList ? countMatches(evidenceList, /<li(?:\s|>)/gi) : 0;
    if (evidenceCount < 2 || evidenceCount > 3) {
      throw new Error(`${file} must render two or three evidence results for ${project.id}.`);
    }
    assertContainsAll(
      article,
      [
        project.summary,
        project.role,
        ...project.detailedDescription,
        ...project.evidenceResults
          .slice(0, 3)
          .flatMap((evidence) => [evidence.label, evidence.value, evidence.method]),
        ...project.technologies,
      ],
      `${file} does not render the complete approved homepage facts for ${project.id}`,
    );
    const expectedWorkLabel =
      project.workMode === 'individual'
        ? 'Individual work by Ahmed'
        : 'Team work with Ahmed’s contribution stated below';
    if (!article.includes(expectedWorkLabel)) {
      throw new Error(`${file} is missing the explicit work-status label for ${project.id}.`);
    }
    const actualArtifactHrefs = [...article.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)].map(
      (match) => match[1],
    );
    const expectedArtifactHrefs = [project.repositoryUrl, project.demoPaperUrl].filter(Boolean);
    if (JSON.stringify(actualArtifactHrefs) !== JSON.stringify(expectedArtifactHrefs)) {
      throw new Error(`${file} renders an unapproved or missing artifact link for ${project.id}.`);
    }
    if (project.repositoryUrl) {
      const repositoryPattern = new RegExp(
        `\\bhref="${escapePattern(project.repositoryUrl)}"`,
        'i',
      );
      if (!repositoryPattern.test(article)) {
        throw new Error(`${file} is missing the approved repository for ${project.id}.`);
      }
    } else if (/data-project-artifacts/i.test(article)) {
      throw new Error(`${file} renders an artifact placeholder for ${project.id}.`);
    }
  }
  for (const project of projects.filter((record) => record.publicationStatus !== 'published')) {
    if (rootMarkup.includes(`data-featured-project-id="${project.id}"`)) {
      throw new Error(`${file} renders unpublished project ${project.id}.`);
    }
  }
  const featuredProjectMarkup = publishedFeatured
    .map((project) => findArticleByAttribute(rootMarkup, 'data-featured-project-id', project.id))
    .join('');
  if (/vroomvroom/i.test(featuredProjectMarkup)) {
    throw new Error(`${file} represents VroomVroom inside personal project content.`);
  }

  assertOrderedAttribute(
    rootMarkup,
    'data-capability-id',
    selectCapabilities(capabilities).map((capability) => capability.id),
    `${file} must render the four approved capability groups`,
  );
  for (const capability of selectCapabilities(capabilities)) {
    const article = findArticleByAttribute(rootMarkup, 'data-capability-id', capability.id);
    if (!article) throw new Error(`${file} is missing capability ${capability.id}.`);
    assertContainsAll(
      article,
      [capability.title, capability.description, ...capability.evidenceProjectIds],
      `${file} does not render the complete approved capability ${capability.id}`,
    );
  }
  assertOrderedAttribute(
    rootMarkup,
    'data-experience-id',
    selectPublishedExperience(experience).map((record) => record.id),
    `${file} must render approved professional experience newest first`,
  );
  for (const record of selectPublishedExperience(experience)) {
    const article = findArticleByAttribute(rootMarkup, 'data-experience-id', record.id);
    if (!article) throw new Error(`${file} is missing professional experience ${record.id}.`);
    assertContainsAll(
      article,
      [
        record.employer,
        record.roleTitle,
        formatMonthRange(record.startDate, record.endDate),
        record.summary,
        ...record.highlights,
        ...record.technologies,
        ...(record.confidentialityNote ? [record.confidentialityNote] : []),
      ],
      `${file} does not render the complete approved experience ${record.id}`,
    );
    if (/<a\b/i.test(article)) {
      throw new Error(`${file} must not render an employer repository or artifact link for ${record.id}.`);
    }
  }
  if (/60\s*(?:%|percent|per-?cent)|sixty[-\s]?per-?cent/i.test(rootMarkup)) {
    throw new Error(`${file} contains the unapproved Ayming metric.`);
  }
  assertOrderedAttribute(
    rootMarkup,
    'data-skill-group-id',
    selectPublishedSkillGroups(skills, projects, experience).map((group) => group.id),
    `${file} must render only evidence-backed skill groups`,
  );
  for (const group of selectPublishedSkillGroups(skills, projects, experience)) {
    const article = findArticleByAttribute(rootMarkup, 'data-skill-group-id', group.id);
    if (!article) throw new Error(`${file} is missing skill group ${group.id}.`);
    assertContainsAll(
      article,
      [group.title, ...group.skills.map((skill) => skill.name)],
      `${file} does not render the evidence-backed skills for ${group.id}`,
    );
  }
  assertOrderedAttribute(
    rootMarkup,
    'data-certification-id',
    selectFeaturedCertifications(certifications).map((record) => record.id),
    `${file} must render the exact certification order`,
  );
  for (const record of selectFeaturedCertifications(certifications)) {
    const article = findArticleByAttribute(rootMarkup, 'data-certification-id', record.id);
    if (!article) throw new Error(`${file} is missing certification ${record.id}.`);
    assertContainsAll(
      article,
      [record.title, record.issuer],
      `${file} does not render the approved certification ${record.id}`,
    );
    const certificationDates = [
      formatMonthYear(record.issuedDate),
      ...(record.expiresDate ? [formatMonthYear(record.expiresDate)] : []),
    ];
    assertContainsAll(
      article,
      certificationDates,
      `${file} does not render the approved certification dates for ${record.id}`,
    );
    if (record.credentialUrl === null && /<a\b/i.test(article)) {
      throw new Error(`${file} renders an unapproved credential link for ${record.id}.`);
    }
  }
  assertOrderedAttribute(
    rootMarkup,
    'data-education-id',
    selectPublishedEducation(education).map((record) => record.id),
    `${file} must render the approved education order`,
  );
  for (const record of selectPublishedEducation(education)) {
    const article = findArticleByAttribute(rootMarkup, 'data-education-id', record.id);
    if (!article) throw new Error(`${file} is missing education ${record.id}.`);
    assertContainsAll(
      article,
      [record.institution, record.program, formatYearRange(record.startDate, record.endDate), record.location],
      `${file} does not render the approved education facts for ${record.id}`,
    );
  }
  assertOrderedAttribute(
    rootMarkup,
    'data-home-contact-kind',
    ['email', 'linkedin', 'github'],
    `${file} must render exactly the three approved homepage contacts`,
  );
  for (const link of Object.values(profile.links)) {
    const homeContactPattern = new RegExp(
      `<a\\b(?=[^>]*\\bdata-home-contact-kind="${escapePattern(link.kind)}")(?=[^>]*\\bhref="${escapePattern(link.href)}")[^>]*>`,
      'i',
    );
    if (!homeContactPattern.test(rootMarkup)) {
      throw new Error(`${file} is missing the approved homepage ${link.label} destination.`);
    }
  }
  assertExactCount(
    rootMarkup,
    /data-selected-work-state="evidence-review"/gi,
    1,
    `${file} must contain the selected-work evidence-review state`,
  );
  if (
    !rootMarkup.includes(
      'Only evidence-reviewed work is published here; additional technical case studies remain under validation.',
    )
  ) {
    throw new Error(`${file} is missing the approved selected-work publication statement.`);
  }
  assertExactCount(rootMarkup, /<form(?:\s|>)/gi, 0, `${file} must not contain a contact form`);
}

export function assertProjectsPlaceholder(rootMarkup, file = 'projects/index.html') {
  assertExactCount(
    rootMarkup,
    /data-projects-placeholder=""/gi,
    1,
    `${file} must retain one explicit Projects placeholder`,
  );
  assertExactCount(
    rootMarkup,
    /data-featured-project-id=/gi,
    0,
    `${file} must not render flagship project articles during Milestone 4`,
  );
  for (const project of projects) {
    if (rootMarkup.includes(project.id) || rootMarkup.includes(project.title)) {
      throw new Error(`${file} renders project record ${project.id} before Milestone 5.`);
    }
  }
}

export function assertStaticShell(rootMarkup, contract, file = contract.relativeFile ?? contract.id) {
  assertExactCount(rootMarkup, /class="skip-link"/gi, 1, `${file} must contain one skip link`);
  assertExactCount(rootMarkup, /<header(?:\s|>)/gi, 1, `${file} must contain one site header`);
  assertExactCount(rootMarkup, /<main\b[^>]*\bid="main"[^>]*>/gi, 1, `${file} must contain one #main landmark`);
  assertExactCount(rootMarkup, /<h1(?:\s|>)/gi, 1, `${file} must contain exactly one h1`);
  assertExactCount(rootMarkup, /<footer(?:\s|>)/gi, 1, `${file} must contain one footer`);
  assertExactCount(
    rootMarkup,
    /<nav\b[^>]*\baria-label="Primary"[^>]*>/gi,
    1,
    `${file} must contain one labelled primary navigation`,
  );
  assertExactCount(rootMarkup, /<details(?:\s|>)/gi, 1, `${file} must contain one native navigation disclosure`);
  assertExactCount(rootMarkup, /<summary(?:\s|>)/gi, 1, `${file} must contain one disclosure summary`);

  const skipLink = rootMarkup.match(/<a\b[^>]*\bclass="skip-link"[^>]*>/i)?.[0] ?? '';
  if (!/\bhref="#main"/i.test(skipLink) || rootMarkup.indexOf(skipLink) > rootMarkup.search(/<header(?:\s|>)/i)) {
    throw new Error(`${file} skip link must target #main and precede the header.`);
  }

  const primaryNavigation = rootMarkup.match(
    /<nav\b[^>]*\baria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/i,
  )?.[1];
  if (!primaryNavigation) throw new Error(`${file} primary navigation content is missing.`);

  for (const item of getPrimaryNavigationItems(contract.id)) {
    const linkPattern = new RegExp(
      `<a\\b(?=[^>]*\\bhref="${escapePattern(item.href)}")[^>]*>[\\s\\S]*?${escapePattern(item.label)}[\\s\\S]*?<\\/a>`,
      'i',
    );
    if (!linkPattern.test(primaryNavigation)) {
      throw new Error(`${file} primary navigation is missing ${item.label}.`);
    }
  }

  assertExactCount(
    rootMarkup,
    /data-footer-contacts=""/gi,
    1,
    `${file} must contain one footer contact list`,
  );
  for (const link of Object.values(profile.links)) {
    const hrefPattern = new RegExp(`\\bhref="${escapePattern(link.href)}"`, 'i');
    const kindPattern = new RegExp(`\\bdata-contact-kind="${escapePattern(link.kind)}"`, 'i');
    if (!hrefPattern.test(rootMarkup) || !kindPattern.test(rootMarkup)) {
      throw new Error(`${file} footer is missing the approved ${link.label} contact link.`);
    }
  }

  if (contract.id === 'home') assertHomeNarrative(rootMarkup, file);
  if (contract.id === 'projects') assertProjectsPlaceholder(rootMarkup, file);
}

export function verifyPageHtml(html, contract, file = contract.relativeFile ?? contract.id) {
  if (!/<script\b[^>]*type=["']module["'][^>]*>/i.test(html)) {
    throw new Error(`${file} does not reference a client module.`);
  }
  const rootMarkup = extractRootMarkup(html, file);
  const text = visibleText(rootMarkup);
  if (!text) throw new Error(`${file} has an empty, whitespace-only, or comment-only mount.`);
  if (/^(?:loading(?:…|\.\.\.)?|please wait)$/i.test(text)) {
    throw new Error(`${file} contains only a loading shell.`);
  }
  if (html.includes('<!--app-html-->')) {
    throw new Error(`${file} still contains the prerender injection marker.`);
  }
  if (countMatches(rootMarkup, /<main(?:\s|>)/gi) !== 1) {
    throw new Error(`${file} must contain exactly one main landmark in #root.`);
  }

  const escapedHeading = contract.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingPattern = new RegExp(`<h1(?:\\s[^>]*)?>[\\s\\S]*?${escapedHeading}[\\s\\S]*?<\\/h1>`, 'i');
  if (!headingPattern.test(rootMarkup)) {
    throw new Error(`${file} is missing the expected h1: ${contract.heading}.`);
  }
  for (const requiredPattern of [/<nav(?:\s|>)/i, /<footer(?:\s|>)/i, /data-hydrate-navigation/i]) {
    if (!requiredPattern.test(rootMarkup)) throw new Error(`${file} is missing required static shell content.`);
  }
  if (!rootMarkup.includes(`data-static-page="${contract.id}"`)) {
    throw new Error(`${file} is missing its static page identifier.`);
  }
  assertStaticShell(rootMarkup, contract, file);
  return rootMarkup;
}

export function assertAllowedArtifactFilename(normalizedName) {
  const extension = extname(normalizedName.toLowerCase());
  if (!ALLOWED_ARTIFACT_EXTENSIONS.has(extension)) {
    throw new Error(`artifact-extension: ${normalizedName}`);
  }
  const lowerName = normalizedName.toLowerCase();
  if (FORBIDDEN_FILENAME_FRAGMENTS.some((fragment) => lowerName.includes(fragment))) {
    throw new Error(`private-artifact-filename: ${normalizedName}`);
  }
}

export function assertPublishSafeArtifactText(content, normalizedName) {
  const extension = extname(normalizedName).toLowerCase();
  const reviewContent =
    extension === '.html' || extension === '.svg'
      ? content.replaceAll(/\sd=(["'])([^"']*)\1/gi, (attribute, quote, pathData) =>
          SVG_PATH_DATA_PATTERN.test(pathData) ? ` d=${quote}${quote}` : attribute,
        )
      : content;
  const rules = inspectArtifactText(reviewContent);
  if (rules.length > 0) throw new Error(`${rules[0]}: ${normalizedName}`);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`symbolic-link-artifact: ${entry.name}`);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

export async function verifyDistribution({
  distDirectory = defaultDistDirectory,
  pageContracts = DEFAULT_PAGE_CONTRACTS,
} = {}) {
  const verifiedPages = [];
  for (const contract of pageContracts) {
    const file = resolve(distDirectory, contract.relativeFile);
    const html = await readFile(file, 'utf8');
    verifyPageHtml(html, contract, contract.relativeFile);
    verifiedPages.push({
      file: contract.relativeFile.replaceAll('\\', '/'),
      bytes: Buffer.byteLength(html, 'utf8'),
    });
  }

  const outputFiles = await listFiles(distDirectory);
  for (const file of outputFiles) {
    const normalizedName = relative(distDirectory, file).replaceAll('\\', '/');
    if ((await lstat(file)).isSymbolicLink()) throw new Error(`symbolic-link-artifact: ${normalizedName}`);
    assertAllowedArtifactFilename(normalizedName);
    if (TEXT_ARTIFACT_EXTENSIONS.has(extname(normalizedName).toLowerCase())) {
      const content = await readFile(file, 'utf8');
      assertPublishSafeArtifactText(content, normalizedName);
    }
  }

  const files = await Promise.all(
    outputFiles.map(async (file) => ({
      file: relative(distDirectory, file).replaceAll('\\', '/'),
      bytes: (await stat(file)).size,
    })),
  );
  return { status: 'verified', pages: verifiedPages, files: files.sort((a, b) => a.file.localeCompare(b.file)) };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  console.log(JSON.stringify(await verifyDistribution(), null, 2));
}
