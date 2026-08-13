import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrimaryNavigationItems } from '../src/components/layout/navigation.js';
import { iconDefinitions } from '../src/components/ui/iconPaths.js';
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
  selectPublishedCertifications,
  selectPublishedEducation,
  selectPublishedExperience,
  selectPublishedProjects,
  selectPublishedSkillGroups,
  selectRemainingCertifications,
} from '../src/data/selectors.js';
import { skills } from '../src/data/skills.js';
import { formatMonthRange, formatMonthYear, formatYearRange } from '../src/utils/dates.js';
import { ALL_PROJECTS_CATEGORY, getAvailableProjectCategories } from '../src/utils/projectFilters.js';
import {
  getProjectArtifactLinks,
  getProjectCategoryLabel,
  getProjectWorkModeLabel,
} from '../src/utils/projectPresentation.js';
import { inspectArtifactText } from '../src/validation/privacy.js';
import { approvedDistPaths } from './assets/manifest.mjs';
import { verifyPageMetadataHtml } from './metadata/html-transform.mjs';
import { approvedCrawlDistPaths } from './static/manifest.mjs';
import { verifyDistAssets } from './verify-assets.mjs';
import { verifyDistCrawlFiles } from './verify-crawl-files.mjs';

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
const APPROVED_ICON_PATHS = new Set(
  Object.values(iconDefinitions).flatMap((definition) => definition.paths),
);
export const FIXED_DISTRIBUTION_PATHS = Object.freeze([
  'index.html',
  'projects/index.html',
  ...approvedDistPaths,
  ...approvedCrawlDistPaths,
]);
export const EXPECTED_LOGICAL_BUILD_ASSETS = Object.freeze([
  'home.js',
  'hydrateNavigation.css',
  'hydrateNavigation.js',
  'projects.css',
  'projects.js',
]);
const EXPECTED_PAGE_LOGICAL_ASSETS = Object.freeze({
  home: Object.freeze(['home.js', 'hydrateNavigation.css', 'hydrateNavigation.js']),
  projects: Object.freeze([
    'hydrateNavigation.css',
    'hydrateNavigation.js',
    'projects.css',
    'projects.js',
  ]),
});
const BUILD_ASSET_PATTERN = /^assets\/(home|projects|hydrateNavigation)-([A-Za-z0-9_-]{6,})\.(css|js)$/;
const STRICT_START_TAG_NAMES = new Set(['link', 'path', 'script']);
const RAW_TEXT_TAG_NAMES = new Set(['script', 'style', 'textarea', 'title']);
const EXPECTED_BUILD_ASSET_ROLES = Object.freeze({
  home: Object.freeze({
    'home.js': Object.freeze({ tagName: 'script', referenceAttribute: 'src', type: 'module' }),
    'hydrateNavigation.css': Object.freeze({ tagName: 'link', referenceAttribute: 'href', rel: 'stylesheet' }),
    'hydrateNavigation.js': Object.freeze({ tagName: 'link', referenceAttribute: 'href', rel: 'modulepreload' }),
  }),
  projects: Object.freeze({
    'hydrateNavigation.css': Object.freeze({ tagName: 'link', referenceAttribute: 'href', rel: 'stylesheet' }),
    'hydrateNavigation.js': Object.freeze({ tagName: 'link', referenceAttribute: 'href', rel: 'modulepreload' }),
    'projects.css': Object.freeze({ tagName: 'link', referenceAttribute: 'href', rel: 'stylesheet' }),
    'projects.js': Object.freeze({ tagName: 'script', referenceAttribute: 'src', type: 'module' }),
  }),
});
const REGEX_PREFIX_KEYWORDS = new Set([
  'await',
  'case',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);
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
    const projectHref = `/projects/#${project.id}`;
    if (
      !new RegExp(
        `<h3(?:\\s[^>]*)?>\\s*<a\\b(?=[^>]*\\bhref="${escapePattern(projectHref)}")[^>]*>${escapePattern(project.title)}<\\/a>\\s*<\\/h3>`,
        'i',
      ).test(article)
    ) {
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
    const expectedWorkLabel = getProjectWorkModeLabel(project.workMode);
    if (!article.includes(expectedWorkLabel)) {
      throw new Error(`${file} is missing the explicit work-status label for ${project.id}.`);
    }
    const actualArtifactHrefs = [...article.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)].map(
      (match) => match[1],
    );
    const expectedArtifactHrefs = [
      projectHref,
      ...getProjectArtifactLinks(project).map((link) => link.href),
    ];
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
  const featuredCertifications = selectFeaturedCertifications(certifications);
  const remainingCertifications = selectRemainingCertifications(certifications);
  const publishedCertifications = selectPublishedCertifications(certifications);
  const certificationSection = rootMarkup.match(
    /<section\b(?=[^>]*\bid="certifications")[^>]*>[\s\S]*?<\/section>/i,
  )?.[0];
  if (!certificationSection) throw new Error(`${file} is missing the certifications section.`);
  assertExactCount(
    certificationSection,
    /<h2(?:\s|>)/gi,
    1,
    `${file} certifications section must contain exactly one h2`,
  );
  if (/\bdata-hydrat(?:e|ion-status)\b/i.test(certificationSection)) {
    throw new Error(`${file} certification content must remain outside hydration islands.`);
  }
  const featuredList = certificationSection.match(
    /<ol\b(?=[^>]*\bdata-certification-list="featured")[^>]*>([\s\S]*?)<\/ol>/i,
  );
  if (!featuredList) throw new Error(`${file} is missing the featured certification list.`);
  const disclosure = certificationSection.match(
    /<details\b(?=[^>]*\bdata-certification-disclosure(?:="[^"]*")?)[^>]*>([\s\S]*?)<\/details>/i,
  );
  if (!disclosure) throw new Error(`${file} is missing the native certification disclosure.`);
  const disclosureOpening = disclosure[0].match(/^<details\b[^>]*>/i)?.[0] ?? '';
  if (/\sopen(?:\s|=|>)/i.test(disclosureOpening)) {
    throw new Error(`${file} must not open the certification disclosure by default.`);
  }
  const summary = disclosure[1].match(/<summary\b([^>]*)>([\s\S]*?)<\/summary>/i);
  if (!summary || visibleText(summary[2]) !== 'View all certifications (8 more)') {
    throw new Error(`${file} has an unexpected certification disclosure summary.`);
  }
  if (/\baria-expanded\s*=/i.test(summary[1]) || /<(?:a|button|input|select|textarea)\b/i.test(summary[2])) {
    throw new Error(`${file} certification summary must use native state without nested controls.`);
  }
  if (/<(?:header|nav|main|section|aside|footer)\b/i.test(disclosure[1])) {
    throw new Error(`${file} certification disclosure must not introduce an extra landmark or section.`);
  }
  const remainingList = disclosure[1].match(
    /<ol\b(?=[^>]*\bdata-certification-list="remaining")(?=[^>]*\bstart="4")[^>]*>([\s\S]*?)<\/ol>/i,
  );
  if (!remainingList) throw new Error(`${file} is missing the ordered remaining certification list.`);
  if (certificationSection.indexOf(featuredList[0]) > certificationSection.indexOf(disclosure[0])) {
    throw new Error(`${file} must render featured certifications before the disclosure.`);
  }
  assertOrderedAttribute(
    featuredList[1],
    'data-certification-id',
    featuredCertifications.map((record) => record.id),
    `${file} must render the exact featured certification order`,
  );
  assertOrderedAttribute(
    remainingList[1],
    'data-certification-id',
    remainingCertifications.map((record) => record.id),
    `${file} must render the exact remaining certification order`,
  );
  assertOrderedAttribute(
    certificationSection,
    'data-certification-id',
    publishedCertifications.map((record) => record.id),
    `${file} must render every published certification exactly once`,
  );
  for (const record of publishedCertifications) {
    const article = findArticleByAttribute(rootMarkup, 'data-certification-id', record.id);
    if (!article) throw new Error(`${file} is missing certification ${record.id}.`);
    assertExactCount(
      article,
      /<h3(?:\s|>)/gi,
      1,
      `${file} certification ${record.id} must contain exactly one h3`,
    );
    const cardHeading = article.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '';
    if (visibleText(cardHeading) !== record.title) {
      throw new Error(`${file} certification ${record.id} must use its approved title as the h3.`);
    }
    assertContainsAll(
      article,
      [record.title, record.issuer],
      `${file} does not render the approved certification ${record.id}`,
    );
    const certificationDates = [`Issued ${formatMonthYear(record.issuedDate)}`];
    if (record.credentialStatus === 'active') {
      certificationDates.push(`Expires ${formatMonthYear(record.expiresDate)}`);
    } else if (record.credentialStatus === 'expired') {
      certificationDates.push(`Expired ${formatMonthYear(record.expiresDate)}`);
    }
    assertContainsAll(
      visibleText(article),
      certificationDates,
      `${file} does not render the approved certification dates for ${record.id}`,
    );
    if (
      record.credentialStatus === null &&
      /\b(?:Expires|Expired)\s+[A-Z][a-z]+\s+\d{4}\b/.test(visibleText(article))
    ) {
      throw new Error(`${file} renders an unapproved validity claim for ${record.id}.`);
    }
    if (record.credentialUrl === null && /<(?:a|button)\b/i.test(article)) {
      throw new Error(`${file} renders an unapproved credential control for ${record.id}.`);
    }
    if (/<img\b/i.test(article)) {
      throw new Error(`${file} renders a prohibited certification image for ${record.id}.`);
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

export function assertProjectsNarrative(rootMarkup, file = 'projects/index.html') {
  const publishedProjects = selectPublishedProjects(projects);
  const availableCategories = getAvailableProjectCategories(publishedProjects);

  assertExactCount(
    rootMarkup,
    /data-projects-placeholder=""/gi,
    0,
    `${file} must not retain the Milestone 4 Projects placeholder`,
  );
  assertExactCount(
    rootMarkup,
    /data-hydrate-projects=""/gi,
    1,
    `${file} must contain one Projects explorer hydration island`,
  );
  assertExactCount(
    rootMarkup,
    /data-project-filter-controls=""[^>]*\bhidden=""/gi,
    1,
    `${file} filter controls must remain hidden before enhancement`,
  );
  assertOrderedAttribute(
    rootMarkup,
    'data-project-filter',
    [ALL_PROJECTS_CATEGORY, ...availableCategories],
    `${file} must render only useful published-project filters`,
  );
  const allFilterButton = rootMarkup.match(
    /<button\b[^>]*\bdata-project-filter="all"[^>]*>/i,
  )?.[0];
  if (!allFilterButton || !/\baria-pressed="true"/i.test(allFilterButton)) {
    throw new Error(`${file} must server-render All as the selected filter.`);
  }
  assertExactCount(
    rootMarkup,
    /data-project-results-status=""/gi,
    1,
    `${file} must render one project-results status`,
  );
  if (!rootMarkup.includes(`Showing ${publishedProjects.length} of ${publishedProjects.length} projects.`)) {
    throw new Error(`${file} must server-render the complete All result count.`);
  }

  assertOrderedAttribute(
    rootMarkup,
    'data-project-article-id',
    publishedProjects.map((project) => project.id),
    `${file} must render every published project in deterministic order`,
  );
  assertExactCount(
    rootMarkup,
    /<img(?:\s|>)/gi,
    publishedProjects.filter((project) => project.image !== null).length,
    `${file} must not render image placeholders for null project images`,
  );

  for (const project of publishedProjects) {
    const article = findArticleByAttribute(rootMarkup, 'data-project-article-id', project.id);
    if (!article) throw new Error(`${file} is missing published project article ${project.id}.`);
    if (!article.includes(`href="#${project.id}"`) || !article.includes(project.title)) {
      throw new Error(`${file} has a title or deep-link mismatch for ${project.id}.`);
    }
    if (!new RegExp(`\\bdata-work-mode="${project.workMode}"`, 'i').test(article)) {
      throw new Error(`${file} is missing the work-mode contract for ${project.id}.`);
    }

    assertContainsAll(
      article,
      [
        project.summary,
        project.role,
        getProjectWorkModeLabel(project.workMode),
        ...project.detailedDescription,
        ...project.technologies,
        ...project.categories.map(getProjectCategoryLabel),
        ...project.evidenceResults.flatMap((evidence) => [
          evidence.label,
          evidence.value,
          evidence.method,
        ]),
      ],
      `${file} does not render every approved project field for ${project.id}`,
    );

    const evidenceList = article.match(
      /<ul\b[^>]*\bdata-project-evidence=""[^>]*>([\s\S]*?)<\/ul>/i,
    )?.[1];
    const evidenceCount = evidenceList ? countMatches(evidenceList, /<li(?:\s|>)/gi) : 0;
    if (evidenceCount !== project.evidenceResults.length) {
      throw new Error(`${file} must render every evidence result for ${project.id}.`);
    }
    for (const evidence of project.evidenceResults) {
      const evidenceItem = evidenceList?.match(
        new RegExp(
          `<li(?:\\s[^>]*)?>[\\s\\S]*?${escapePattern(evidence.label)}[\\s\\S]*?<\\/li>`,
          'i',
        ),
      )?.[0];
      if (
        !evidenceItem ||
        !evidenceItem.includes(evidence.value) ||
        !evidenceItem.includes(evidence.method)
      ) {
        throw new Error(`${file} has incomplete evidence details for ${project.id}.`);
      }
    }

    const actualHrefs = [...article.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)].map(
      (match) => match[1],
    );
    const expectedHrefs = [
      `#${project.id}`,
      ...getProjectArtifactLinks(project).map((link) => link.href),
    ];
    if (JSON.stringify(actualHrefs) !== JSON.stringify(expectedHrefs)) {
      throw new Error(`${file} renders an unapproved, missing or placeholder link for ${project.id}.`);
    }
    if (getProjectArtifactLinks(project).length === 0 && /data-project-artifacts/i.test(article)) {
      throw new Error(`${file} renders an artifact placeholder for ${project.id}.`);
    }
  }

  for (const project of projects.filter((record) => record.publicationStatus !== 'published')) {
    if (
      rootMarkup.includes(`data-project-article-id="${project.id}"`) ||
      rootMarkup.includes(project.title)
    ) {
      throw new Error(`${file} renders unpublished project ${project.id}.`);
    }
  }
}

export function assertStaticShell(rootMarkup, contract, file = contract.relativeFile ?? contract.id) {
  assertExactCount(rootMarkup, /class="skip-link"/gi, 1, `${file} must contain one skip link`);
  assertExactCount(
    rootMarkup,
    /<header\b(?=[^>]*\bclass="[^"]*\bsite-header\b[^"]*")[^>]*>/gi,
    1,
    `${file} must contain one site header`,
  );
  assertExactCount(rootMarkup, /<main\b[^>]*\bid="main"[^>]*>/gi, 1, `${file} must contain one #main landmark`);
  assertExactCount(rootMarkup, /<h1(?:\s|>)/gi, 1, `${file} must contain exactly one h1`);
  assertExactCount(
    rootMarkup,
    /<footer\b(?=[^>]*\bclass="[^"]*\bsite-footer\b[^"]*")[^>]*>/gi,
    1,
    `${file} must contain one site footer`,
  );
  assertExactCount(
    rootMarkup,
    /<nav\b[^>]*\baria-label="Primary"[^>]*>/gi,
    1,
    `${file} must contain one labelled primary navigation`,
  );
  assertExactCount(
    rootMarkup,
    /<details\b(?=[^>]*\bclass="[^"]*\bsite-nav__disclosure\b[^"]*")[^>]*>/gi,
    1,
    `${file} must contain one native navigation disclosure`,
  );
  assertExactCount(
    rootMarkup,
    /<summary\b(?=[^>]*\bclass="[^"]*\bsite-nav__summary\b[^"]*")[^>]*>/gi,
    1,
    `${file} must contain one navigation disclosure summary`,
  );

  const skipLink = rootMarkup.match(/<a\b[^>]*\bclass="skip-link"[^>]*>/i)?.[0] ?? '';
  if (
    !/\bhref="#main"/i.test(skipLink) ||
    rootMarkup.indexOf(skipLink) > rootMarkup.search(/<header\b[^>]*\bsite-header\b/i)
  ) {
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
  if (contract.id === 'projects') assertProjectsNarrative(rootMarkup, file);
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

export function assertAllowedArtifactFilename(normalizedName, trustedPaths) {
  if (trustedPaths !== undefined && !trustedPaths.has(normalizedName)) {
    throw new Error(`untrusted-distribution-path: ${normalizedName}`);
  }
  const extension = extname(normalizedName.toLowerCase());
  if (!ALLOWED_ARTIFACT_EXTENSIONS.has(extension)) {
    throw new Error(`artifact-extension: ${normalizedName}`);
  }
  const lowerName = normalizedName.toLowerCase();
  if (FORBIDDEN_FILENAME_FRAGMENTS.some((fragment) => lowerName.includes(fragment))) {
    throw new Error(`private-artifact-filename: ${normalizedName}`);
  }
}

function isHtmlWhitespace(character) {
  return character === ' ' || character === '\t' || character === '\n' || character === '\f' || character === '\r';
}

function findRawTextClose(source, tagName, start) {
  const lowerSource = source.toLowerCase();
  let searchFrom = start;
  while (searchFrom < source.length) {
    const closeStart = lowerSource.indexOf(`</${tagName}`, searchFrom);
    if (closeStart === -1) throw new Error(`unterminated-raw-text-tag: ${tagName}`);
    const nameEnd = closeStart + tagName.length + 2;
    const boundary = source[nameEnd];
    if (boundary !== '>' && !isHtmlWhitespace(boundary)) {
      searchFrom = nameEnd;
      continue;
    }
    const closeEnd = source.indexOf('>', nameEnd);
    if (closeEnd === -1) throw new Error(`unterminated-raw-text-close-tag: ${tagName}`);
    if (source.slice(nameEnd, closeEnd).trim() !== '') {
      throw new Error(`malformed-raw-text-close-tag: ${tagName}`);
    }
    return closeEnd + 1;
  }
  throw new Error(`unterminated-raw-text-tag: ${tagName}`);
}

function parseHtmlStartTag(source, start, inSvg) {
  let cursor = start + 1;
  const nameStart = cursor;
  if (!/[A-Za-z]/.test(source[cursor] ?? '')) return null;
  cursor += 1;
  while (/[A-Za-z0-9:-]/.test(source[cursor] ?? '')) cursor += 1;
  const rawName = source.slice(nameStart, cursor);
  const name = rawName.toLowerCase();
  if (!isHtmlWhitespace(source[cursor]) && source[cursor] !== '>' && source[cursor] !== '/') {
    throw new Error(`malformed-start-tag-name: ${name}`);
  }

  const attributes = new Map();
  let selfClosing = false;
  while (cursor < source.length) {
    while (isHtmlWhitespace(source[cursor])) cursor += 1;
    if (source[cursor] === '>') {
      cursor += 1;
      return { name, rawName, attributes, start, end: cursor, selfClosing, inSvg };
    }
    if (source[cursor] === '/' && source[cursor + 1] === '>') {
      selfClosing = true;
      cursor += 2;
      return { name, rawName, attributes, start, end: cursor, selfClosing, inSvg };
    }
    if (cursor >= source.length) break;

    const attributeStart = cursor;
    if (!/[A-Za-z_:]/.test(source[cursor] ?? '')) {
      throw new Error(`malformed-attribute-name: ${name}`);
    }
    cursor += 1;
    while (/[A-Za-z0-9_.:-]/.test(source[cursor] ?? '')) cursor += 1;
    const rawAttributeName = source.slice(attributeStart, cursor);
    const attributeName = rawAttributeName.toLowerCase();
    if (
      !isHtmlWhitespace(source[cursor]) &&
      source[cursor] !== '=' &&
      source[cursor] !== '>' &&
      !(source[cursor] === '/' && source[cursor + 1] === '>')
    ) {
      throw new Error(`malformed-attribute-name: ${name}`);
    }
    while (isHtmlWhitespace(source[cursor])) cursor += 1;

    let quoted = false;
    let quote = null;
    let value = null;
    let valueStart = null;
    let valueEnd = null;
    if (source[cursor] === '=') {
      cursor += 1;
      while (isHtmlWhitespace(source[cursor])) cursor += 1;
      quote = source[cursor];
      if (quote === '"' || quote === "'") {
        quoted = true;
        valueStart = cursor + 1;
        valueEnd = source.indexOf(quote, valueStart);
        if (valueEnd === -1) throw new Error(`unterminated-attribute-value: ${name}-${attributeName}`);
        value = source.slice(valueStart, valueEnd);
        cursor = valueEnd + 1;
      } else {
        valueStart = cursor;
        while (
          cursor < source.length &&
          !isHtmlWhitespace(source[cursor]) &&
          source[cursor] !== '>'
        ) {
          if (/['"<=`]/.test(source[cursor])) {
            throw new Error(`malformed-unquoted-attribute-value: ${name}-${attributeName}`);
          }
          cursor += 1;
        }
        valueEnd = cursor;
        if (valueEnd === valueStart) throw new Error(`missing-attribute-value: ${name}-${attributeName}`);
        value = source.slice(valueStart, valueEnd);
      }
    }

    if (STRICT_START_TAG_NAMES.has(name) && attributes.has(attributeName)) {
      throw new Error(`duplicate-attribute: ${name}-${attributeName}`);
    }
    attributes.set(attributeName, {
      name: attributeName,
      rawName: rawAttributeName,
      value,
      quoted,
      quote,
      valueStart,
      valueEnd,
    });
  }
  throw new Error(`unterminated-start-tag: ${name}`);
}

function tokenizeHtmlStartTags(source) {
  const tags = [];
  let cursor = 0;
  let svgDepth = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start === -1) break;
    if (source.startsWith('<!--', start)) {
      const commentEnd = source.indexOf('-->', start + 4);
      if (commentEnd === -1) throw new Error('unterminated-html-comment');
      cursor = commentEnd + 3;
      continue;
    }
    if (source.startsWith('</', start)) {
      let nameCursor = start + 2;
      if (!/[A-Za-z]/.test(source[nameCursor] ?? '')) {
        cursor = start + 2;
        continue;
      }
      const nameStart = nameCursor;
      nameCursor += 1;
      while (/[A-Za-z0-9:-]/.test(source[nameCursor] ?? '')) nameCursor += 1;
      const name = source.slice(nameStart, nameCursor).toLowerCase();
      const closeEnd = source.indexOf('>', nameCursor);
      if (closeEnd === -1) throw new Error(`unterminated-close-tag: ${name}`);
      if (source.slice(nameCursor, closeEnd).trim() !== '') {
        throw new Error(`malformed-close-tag: ${name}`);
      }
      if (name === 'svg') svgDepth = Math.max(0, svgDepth - 1);
      cursor = closeEnd + 1;
      continue;
    }
    if (source.startsWith('<!', start) || source.startsWith('<?', start)) {
      const declarationEnd = source.indexOf('>', start + 2);
      if (declarationEnd === -1) throw new Error('unterminated-html-declaration');
      cursor = declarationEnd + 1;
      continue;
    }

    const tag = parseHtmlStartTag(source, start, svgDepth > 0);
    if (!tag) {
      cursor = start + 1;
      continue;
    }
    if (tag.name === 'svg') tag.inSvg = true;
    tags.push(tag);
    if (tag.name === 'svg' && !tag.selfClosing) svgDepth += 1;
    if (RAW_TEXT_TAG_NAMES.has(tag.name)) {
      if (tag.selfClosing) throw new Error(`self-closing-raw-text-tag: ${tag.name}`);
      cursor = findRawTextClose(source, tag.name, tag.end);
    } else {
      cursor = tag.end;
    }
  }
  return tags;
}

function exactQuotedAttribute(tag, attributeName, expectedValue) {
  const attribute = tag.attributes.get(attributeName);
  return Boolean(attribute?.quoted && attribute.value === expectedValue);
}

function extractHtmlBuildAssetReferences(html, pageId) {
  const references = [];
  const expectedRoles = EXPECTED_BUILD_ASSET_ROLES[pageId];
  if (!expectedRoles) throw new Error(`unknown-build-asset-page: ${pageId}`);
  for (const tag of tokenizeHtmlStartTags(html)) {
    if (tag.name !== 'script' && tag.name !== 'link') continue;
    const src = tag.attributes.get('src');
    const href = tag.attributes.get('href');
    const assetReferences = [src, href].filter((attribute) =>
      attribute?.value?.startsWith('/assets/'),
    );
    if (assetReferences.length === 0) continue;
    if (assetReferences.length !== 1) throw new Error(`conflicting-build-asset-reference: ${pageId}`);
    const referenceAttribute = assetReferences[0];
    if (!referenceAttribute.quoted || /[?#\\%]/.test(referenceAttribute.value)) {
      throw new Error(`invalid-build-asset-reference: ${pageId}`);
    }

    const pathname = referenceAttribute.value.slice(1);
    const logicalName = logicalBuildAssetName(pathname);
    const expectedRole = expectedRoles[logicalName];
    if (!expectedRole) throw new Error(`unexpected-page-build-asset: ${pageId}-${logicalName}`);
    if (
      tag.name !== expectedRole.tagName ||
      referenceAttribute.name !== expectedRole.referenceAttribute
    ) {
      throw new Error(`wrong-build-asset-role: ${pageId}-${logicalName}`);
    }
    if (tag.name === 'script') {
      if (
        !exactQuotedAttribute(tag, 'type', expectedRole.type) ||
        tag.attributes.has('href') ||
        tag.attributes.has('rel')
      ) {
        throw new Error(`wrong-build-script-contract: ${pageId}-${logicalName}`);
      }
    } else if (
      !exactQuotedAttribute(tag, 'rel', expectedRole.rel) ||
      tag.attributes.has('src') ||
      tag.attributes.has('type')
    ) {
      throw new Error(`wrong-build-link-contract: ${pageId}-${logicalName}`);
    }
    references.push(pathname);
  }
  return references;
}

function logicalBuildAssetName(pathname) {
  const match = pathname.match(BUILD_ASSET_PATTERN);
  if (!match) throw new Error(`unexpected-logical-build-asset: ${pathname}`);
  const logicalName = `${match[1]}.${match[3]}`;
  if (!EXPECTED_LOGICAL_BUILD_ASSETS.includes(logicalName)) {
    throw new Error(`unexpected-logical-build-asset: ${pathname}`);
  }
  return logicalName;
}

export function assertTrustedDistributionPaths(outputNames, pageHtmlById) {
  const names = [...outputNames];
  if (names.some((name) => typeof name !== 'string' || !name || name.includes('\\'))) {
    throw new Error('invalid-distribution-path');
  }
  const outputSet = new Set(names);
  if (outputSet.size !== names.length) throw new Error('duplicate-distribution-path');

  const fixedSet = new Set(FIXED_DISTRIBUTION_PATHS);
  for (const pathname of fixedSet) {
    if (!outputSet.has(pathname)) throw new Error(`missing-fixed-distribution-path: ${pathname}`);
  }

  const reachableAssets = new Set();
  const logicalAssets = new Map();
  for (const pageId of ['home', 'projects']) {
    const html = pageHtmlById?.[pageId];
    if (typeof html !== 'string') throw new Error(`missing-approved-html-graph: ${pageId}`);
    const references = extractHtmlBuildAssetReferences(html, pageId);
    const pageLogicalNames = [];
    for (const pathname of references) {
      const logicalName = logicalBuildAssetName(pathname);
      pageLogicalNames.push(logicalName);
      const previousPath = logicalAssets.get(logicalName);
      if (previousPath && previousPath !== pathname) {
        throw new Error(`duplicate-logical-build-asset: ${logicalName}`);
      }
      logicalAssets.set(logicalName, pathname);
      reachableAssets.add(pathname);
    }
    const actualPageAssets = [...new Set(pageLogicalNames)].sort();
    const expectedPageAssets = [...EXPECTED_PAGE_LOGICAL_ASSETS[pageId]].sort();
    if (
      pageLogicalNames.length !== actualPageAssets.length ||
      JSON.stringify(actualPageAssets) !== JSON.stringify(expectedPageAssets)
    ) {
      throw new Error(`unexpected-page-build-assets: ${pageId}`);
    }
  }

  const actualLogicalAssets = [...logicalAssets.keys()].sort();
  if (JSON.stringify(actualLogicalAssets) !== JSON.stringify(EXPECTED_LOGICAL_BUILD_ASSETS)) {
    throw new Error('incomplete-logical-build-asset-set');
  }

  for (const pathname of names) {
    if (!fixedSet.has(pathname) && !reachableAssets.has(pathname)) {
      throw new Error(`untrusted-distribution-path: ${pathname}`);
    }
  }
  for (const pathname of reachableAssets) {
    if (!outputSet.has(pathname)) throw new Error(`missing-reachable-build-asset: ${pathname}`);
  }

  return new Set([...fixedSet, ...reachableAssets]);
}

export function normalizeJavaScriptForArtifactReview(source) {
  const normalized = source.split('');
  const tokens = [];
  let index = 0;

  function pushToken(token) {
    if (token.type !== 'other' || tokens.at(-1)?.type !== 'other') tokens.push(token);
  }

  function mask(start, end) {
    for (let cursor = start; cursor < end; cursor += 1) normalized[cursor] = ' ';
  }

  function scanQuotedString(quote) {
    const start = index;
    index += 1;

    while (index < source.length) {
      const character = source[index];
      if (character === '\\') {
        index += 2;
        continue;
      }
      if (character === quote) {
        const payload = source.slice(start + 1, index);
        const approvedIcon = APPROVED_ICON_PATHS.has(payload);
        if (approvedIcon) mask(start + 1, index);
        index += 1;
        pushToken({ type: 'string', value: approvedIcon ? '' : payload });
        return;
      }
      if (character === '\n' || character === '\r') break;
      index += 1;
    }

    pushToken({ type: 'other' });
  }

  function scanRegexLiteral() {
    let cursor = index + 1;
    let characterClass = false;
    const quantifiers = [];

    while (cursor < source.length) {
      const character = source[cursor];
      if (character === '\n' || character === '\r') return false;
      if (character === '\\') {
        cursor += 2;
        continue;
      }
      if (character === '[') {
        characterClass = true;
        cursor += 1;
        continue;
      }
      if (character === ']' && characterClass) {
        characterClass = false;
        cursor += 1;
        continue;
      }
      if (character === '{' && !characterClass) {
        const quantifier = source.slice(cursor).match(/^\{\d+(?:,\d*)?\}/)?.[0];
        if (quantifier) {
          quantifiers.push([cursor, cursor + quantifier.length]);
          cursor += quantifier.length;
          continue;
        }
      }
      if (character === '/' && !characterClass) {
        for (const [start, end] of quantifiers) mask(start, end);
        index = cursor + 1;
        while (/[A-Za-z]/.test(source[index] ?? '')) index += 1;
        pushToken({ type: 'other' });
        return true;
      }
      cursor += 1;
    }

    return false;
  }

  function scanTemplate() {
    const start = index;
    let hasInterpolation = false;
    index += 1;

    while (index < source.length) {
      const character = source[index];
      if (character === '\\') {
        index += 2;
        continue;
      }
      if (character === '`') {
        const payload = source.slice(start + 1, index);
        const approvedIcon = !hasInterpolation && APPROVED_ICON_PATHS.has(payload);
        if (approvedIcon) mask(start + 1, index);
        index += 1;
        pushToken(
          hasInterpolation
            ? { type: 'other' }
            : { type: 'string', value: approvedIcon ? '' : payload },
        );
        return;
      }
      if (character === '$' && source[index + 1] === '{') {
        hasInterpolation = true;
        pushToken({ type: 'other' });
        index += 2;
        scanCode(true);
        continue;
      }
      index += 1;
    }

    pushToken({ type: 'other' });
  }

  function scanCode(stopAtTemplateBrace = false) {
    let braceDepth = 0;
    let canStartRegex = true;

    while (index < source.length) {
      const character = source[index];
      const next = source[index + 1];

      if (/\s/.test(character)) {
        index += 1;
        continue;
      }
      if (character === '/' && next === '/') {
        index += 2;
        while (index < source.length && !/[\r\n]/.test(source[index])) index += 1;
        continue;
      }
      if (character === '/' && next === '*') {
        index += 2;
        while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
          index += 1;
        }
        if (index < source.length) index += 2;
        continue;
      }
      if (character === "'" || character === '"') {
        scanQuotedString(character);
        canStartRegex = false;
        continue;
      }
      if (character === '`') {
        scanTemplate();
        canStartRegex = false;
        continue;
      }
      if (character === '/' && canStartRegex && scanRegexLiteral()) {
        canStartRegex = false;
        continue;
      }
      if (/[A-Za-z_$]/.test(character)) {
        const start = index;
        index += 1;
        while (/[A-Za-z0-9_$]/.test(source[index] ?? '')) index += 1;
        const identifier = source.slice(start, index);
        pushToken({ type: 'other' });
        canStartRegex = REGEX_PREFIX_KEYWORDS.has(identifier);
        continue;
      }
      if (/\d/.test(character)) {
        index += 1;
        while (/[A-Za-z0-9_.]/.test(source[index] ?? '')) index += 1;
        pushToken({ type: 'other' });
        canStartRegex = false;
        continue;
      }
      if (character === '{') {
        braceDepth += 1;
        index += 1;
        pushToken({ type: 'other' });
        canStartRegex = true;
        continue;
      }
      if (character === '}') {
        if (stopAtTemplateBrace && braceDepth === 0) {
          index += 1;
          pushToken({ type: 'other' });
          return;
        }
        braceDepth = Math.max(0, braceDepth - 1);
        index += 1;
        pushToken({ type: 'other' });
        canStartRegex = false;
        continue;
      }
      if (character === '+') {
        index += 1;
        pushToken({ type: 'plus' });
        canStartRegex = true;
        continue;
      }

      index += 1;
      pushToken({ type: 'other' });
      canStartRegex = /[([,;:?=!~\-*%&|^<>]/.test(character);
    }
  }

  scanCode();

  const concatenatedStrings = [];
  for (let cursor = 0; cursor < tokens.length; cursor += 1) {
    if (tokens[cursor].type !== 'string') continue;
    let end = cursor;
    let value = tokens[cursor].value;
    while (
      tokens[end + 1]?.type === 'plus' &&
      tokens[end + 2]?.type === 'string'
    ) {
      value += tokens[end + 2].value;
      end += 2;
    }
    if (end > cursor) concatenatedStrings.push(value);
    cursor = end;
  }

  return { content: normalized.join(''), concatenatedStrings };
}

function normalizeApprovedSvgPathsForArtifactReview(source) {
  const normalized = source.split('');
  for (const tag of tokenizeHtmlStartTags(source)) {
    if (tag.name !== 'path' || !tag.inSvg) continue;
    const pathData = tag.attributes.get('d');
    if (!pathData) continue;
    if (!pathData.quoted || pathData.valueStart === null || pathData.valueEnd === null) {
      throw new Error('malformed-svg-path-data');
    }
    if (!APPROVED_ICON_PATHS.has(pathData.value)) continue;
    for (let cursor = pathData.valueStart; cursor < pathData.valueEnd; cursor += 1) {
      normalized[cursor] = ' ';
    }
  }
  return normalized.join('');
}

export function assertPublishSafeArtifactText(content, normalizedName) {
  const extension = extname(normalizedName).toLowerCase();
  let reviewContent =
    extension === '.html' || extension === '.svg'
      ? normalizeApprovedSvgPathsForArtifactReview(content)
      : content;
  let additionalReviewContent = [];
  if (extension === '.js') {
    const normalizedJavaScript = normalizeJavaScriptForArtifactReview(reviewContent);
    reviewContent = normalizedJavaScript.content;
    additionalReviewContent = normalizedJavaScript.concatenatedStrings;
  }
  const rules = new Set(inspectArtifactText(reviewContent));
  for (const value of additionalReviewContent) {
    for (const rule of inspectArtifactText(value)) rules.add(rule);
  }
  const sortedRules = [...rules].sort();
  if (sortedRules.length > 0) throw new Error(`${sortedRules[0]}: ${normalizedName}`);
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
  const verifiedMetadata = [];
  const pageHtmlById = {};
  for (const contract of pageContracts) {
    const file = resolve(distDirectory, contract.relativeFile);
    const html = await readFile(file, 'utf8');
    verifyPageHtml(html, contract, contract.relativeFile);
    const metadata = verifyPageMetadataHtml(html, contract.id);
    pageHtmlById[contract.id] = html;
    verifiedPages.push({
      file: contract.relativeFile.replaceAll('\\', '/'),
      bytes: Buffer.byteLength(html, 'utf8'),
    });
    verifiedMetadata.push({
      page: contract.id,
      title: metadata.title,
      canonicalUrl: metadata.canonicalUrl,
    });
  }

  const assetVerification = await verifyDistAssets({ directory: distDirectory });
  const crawlVerification = await verifyDistCrawlFiles({ directory: distDirectory });
  const outputFiles = await listFiles(distDirectory);
  const outputNames = outputFiles.map((file) => relative(distDirectory, file).replaceAll('\\', '/'));
  const trustedPaths = assertTrustedDistributionPaths(outputNames, pageHtmlById);
  for (const file of outputFiles) {
    const normalizedName = relative(distDirectory, file).replaceAll('\\', '/');
    const artifactStat = await lstat(file);
    if (artifactStat.isSymbolicLink()) throw new Error(`symbolic-link-artifact: ${normalizedName}`);
    if (!artifactStat.isFile()) throw new Error(`non-regular-artifact: ${normalizedName}`);
    assertAllowedArtifactFilename(normalizedName, trustedPaths);
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
  return {
    status: 'verified',
    pages: verifiedPages,
    metadata: verifiedMetadata,
    assets: assetVerification.assets,
    crawlFiles: crawlVerification.files,
    files: files.sort((a, b) => a.file.localeCompare(b.file)),
  };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  console.log(JSON.stringify(await verifyDistribution(), null, 2));
}
