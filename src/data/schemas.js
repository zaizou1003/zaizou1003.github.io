import {
  APPROVED_CAPABILITY_CONTRACTS,
  APPROVED_CERTIFICATION_CONTRACTS,
  APPROVED_EDUCATION_CONTRACTS,
  APPROVED_EXPERIENCE_CONTRACTS,
  APPROVED_PROFILE_CONTRACT,
  APPROVED_PROJECT_CONTRACTS,
} from './contracts.js';
import { inspectStructuredPrivacy } from '../validation/privacy.js';

export const PUBLICATION_STATUSES = Object.freeze([
  'draft',
  'evidence-pending',
  'published',
  'withheld',
]);

export const PROJECT_CATEGORIES = Object.freeze([
  'agentic-ai',
  'mcp',
  'rag',
  'applied-research',
  'responsible-ai',
  'computer-vision',
  'production-ai',
  'data-systems',
]);

export const FLAGSHIP_PROJECTS = Object.freeze(
  APPROVED_PROJECT_CONTRACTS.map(({ id, title, featuredOrder }) =>
    Object.freeze({ id, title, featuredOrder }),
  ),
);

export const FEATURED_CERTIFICATIONS = Object.freeze(
  APPROVED_CERTIFICATION_CONTRACTS.map(({ id, title, issuer, featuredOrder }) =>
    Object.freeze({ id, title, issuer, featuredOrder }),
  ),
);

export class ContentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function fail(message) {
  throw new ContentValidationError(message);
}

function assertObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${path} must be an object.`);
  }
}

function assertAllowedKeys(value, allowedKeys, path) {
  assertObject(value, path);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${path}.${key} is not part of the publish-safe contract.`);
  }
}

function assertString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${path} must be a non-empty string.`);
}

function assertNullableString(value, path) {
  if (value !== null) assertString(value, path);
}

function assertStringArray(value, path, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${path} must be ${allowEmpty ? 'an' : 'a non-empty'} array.`);
  }
  value.forEach((item, index) => assertString(item, `${path}[${index}]`));
  if (new Set(value).size !== value.length) fail(`${path} must not contain duplicate values.`);
}

function assertPublicationStatus(value, path) {
  if (!PUBLICATION_STATUSES.includes(value)) fail(`${path} has an invalid publication status.`);
}

function assertKebabId(value, path) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    fail(`${path} must be a stable lowercase kebab-case identifier.`);
  }
}

function assertUniqueIds(records, path) {
  const ids = new Set();
  records.forEach((record, index) => {
    assertKebabId(record.id, `${path}[${index}].id`);
    if (ids.has(record.id)) fail(`${path} contains duplicate id ${record.id}.`);
    ids.add(record.id);
  });
}

function assertYear(value, path) {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) fail(`${path} must use YYYY.`);
  const year = Number(value);
  if (year < 1900 || year > 2100) fail(`${path} is outside the supported year range.`);
}

function assertYearMonth(value, path) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    fail(`${path} must use a valid YYYY-MM date.`);
  }
}

function assertChronology(startDate, endDate, path) {
  if (endDate !== null && endDate < startDate) fail(`${path} end date precedes its start date.`);
}

function assertApprovedFields(actual, expected, path, { allowedExtraKeys = [] } = {}) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      fail(`${path} must match the owner-approved list length and order.`);
    }
    expected.forEach((item, index) => assertApprovedFields(actual[index], item, `${path}[${index}]`));
    return;
  }

  if (expected && typeof expected === 'object') {
    assertObject(actual, path);
    const allowedExtras = new Set(allowedExtraKeys);
    for (const key of Object.keys(actual)) {
      if (!Object.hasOwn(expected, key) && !allowedExtras.has(key)) {
        fail(`${path}.${key} is not part of the owner-approved contract.`);
      }
    }
    for (const [key, value] of Object.entries(expected)) {
      if (!Object.hasOwn(actual, key)) fail(`${path}.${key} is required by the owner-approved contract.`);
      assertApprovedFields(actual[key], value, `${path}.${key}`);
    }
    return;
  }

  if (actual !== expected) fail(`${path} must match the owner-approved value.`);
}

const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'buff.ly',
  'goo.gl',
  'is.gd',
  'ow.ly',
  'rebrand.ly',
  'shorturl.at',
  't.co',
  'tinyurl.com',
]);

const APPROVED_REPOSITORY_URLS = new Set([
  'https://github.com/zaizou1003/Air-Quality-Agent',
  'https://github.com/zaizou1003/finrl-deepseek-phase1',
]);

export function assertSafeUrl(value, path = 'url', { allowMailto = false } = {}) {
  assertString(value, path);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${path} must be an absolute, stable URL.`);
  }

  if (parsed.protocol === 'mailto:') {
    if (!allowMailto) fail(`${path} does not permit mailto URLs.`);
    if (parsed.search || parsed.hash || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parsed.pathname)) {
      fail(`${path} must be a plain approved email link without parameters.`);
    }
    return;
  }

  if (parsed.protocol !== 'https:') fail(`${path} must use HTTPS.`);
  if (parsed.username || parsed.password) fail(`${path} must not contain embedded credentials.`);
  if (parsed.search || parsed.hash) {
    fail(`${path} must not contain query parameters or fragments.`);
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if ([...SHORTENER_HOSTS].some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`))) {
    fail(`${path} must not use a URL shortener or one of its subdomains.`);
  }
}

function assertRepositoryUrl(value, path) {
  assertSafeUrl(value, path);
  if (!APPROVED_REPOSITORY_URLS.has(value)) {
    fail(`${path} is not an owner-approved public repository URL.`);
  }
}

function assertLocalImagePath(value, path) {
  assertString(value, path);
  if (
    value.includes('\\') ||
    value.includes('..') ||
    value.includes('?') ||
    value.includes('#') ||
    !/^\/images\/[a-z0-9/_-]+\.(?:avif|webp|jpe?g|png|svg)$/.test(value)
  ) {
    fail(`${path} must be an approved local image path without traversal, parameters, or fragments.`);
  }
}

function assertSrcSet(value, path) {
  assertString(value, path);
  const candidates = value.split(',').map((candidate) => candidate.trim());
  if (candidates.some((candidate) => candidate === '')) fail(`${path} contains an empty candidate.`);

  const descriptors = new Set();
  const sources = new Set();
  let descriptorKind = null;
  candidates.forEach((candidate, index) => {
    const parts = candidate.split(/\s+/);
    if (parts.length !== 2) fail(`${path}[${index}] must contain one local path and one descriptor.`);
    const [source, descriptor] = parts;
    assertLocalImagePath(source, `${path}[${index}].src`);

    const widthDescriptor = /^[1-9]\d*w$/.test(descriptor);
    const densityDescriptor = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)x$/.test(descriptor);
    if (!widthDescriptor && !densityDescriptor) {
      fail(`${path}[${index}].descriptor must be a positive integer width or positive numeric density.`);
    }
    const currentKind = widthDescriptor ? 'width' : 'density';
    if (descriptorKind && descriptorKind !== currentKind) fail(`${path} must not mix width and density descriptors.`);
    descriptorKind = currentKind;
    const normalizedDescriptor = `${currentKind}:${Number(descriptor.slice(0, -1))}`;
    if (descriptors.has(normalizedDescriptor)) fail(`${path} contains a duplicate descriptor.`);
    if (sources.has(source)) fail(`${path} contains a duplicate source.`);
    descriptors.add(normalizedDescriptor);
    sources.add(source);
  });
}

function assertSizes(value, path) {
  assertString(value, path);
  if (/[\u0000-\u001f{};"'\\/]|url\s*\(/i.test(value)) {
    fail(`${path} contains unsafe or unsupported syntax.`);
  }
  const parts = value.split(',').map((part) => part.trim());
  const length = '(?:0|[1-9]\\d*(?:\\.\\d+)?)(?:px|rem|vw)';
  const mediaLength = '(?:0|[1-9]\\d*(?:\\.\\d+)?)(?:px|rem)';
  const mediaSize = new RegExp(`^\\((?:min|max)-width: ${mediaLength}\\) ${length}$`);
  const plainSize = new RegExp(`^${length}$`);
  if (parts.some((part) => !plainSize.test(part) && !mediaSize.test(part))) {
    fail(`${path} must use a conservative comma-separated width sizes syntax.`);
  }
}

export function assertImage(value, path = 'image', { requireAlt = false } = {}) {
  assertAllowedKeys(value, ['src', 'srcSet', 'sizes', 'alt', 'width', 'height'], path);
  assertLocalImagePath(value.src, `${path}.src`);
  if (typeof value.alt !== 'string' || (requireAlt && value.alt.trim() === '')) {
    fail(`${path}.alt must provide approved alternative text.`);
  }
  if (!Number.isInteger(value.width) || value.width <= 0) fail(`${path}.width must be a positive integer.`);
  if (!Number.isInteger(value.height) || value.height <= 0) fail(`${path}.height must be a positive integer.`);
  if (value.srcSet !== undefined) assertSrcSet(value.srcSet, `${path}.srcSet`);
  if (value.sizes !== undefined) assertSizes(value.sizes, `${path}.sizes`);
}

function assertLink(value, path, expectedKind) {
  assertAllowedKeys(value, ['label', 'href', 'kind'], path);
  assertString(value.label, `${path}.label`);
  if (value.kind !== expectedKind) fail(`${path}.kind must be ${expectedKind}.`);
  assertSafeUrl(value.href, `${path}.href`, { allowMailto: expectedKind === 'email' });
}

function assertPublishSafeTree(value, path = 'content') {
  const violation = inspectStructuredPrivacy(value, path)[0];
  if (violation) {
    const messages = {
      'credential-like-value': 'contains credential-like private content.',
      'phone-like-value': 'contains phone-like private content.',
      'signed-or-expiring-url': 'contains signed or expiring URL content.',
      'forbidden-private-field': 'is a forbidden private or service-identifier field.',
    };
    fail(`${violation.path} ${messages[violation.rule]}`);
  }

  function inspectEmbeddedUrls(current, currentPath) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => inspectEmbeddedUrls(item, `${currentPath}[${index}]`));
    } else if (current && typeof current === 'object') {
      for (const [key, child] of Object.entries(current)) {
        inspectEmbeddedUrls(child, `${currentPath}.${key}`);
      }
    } else if (typeof current === 'string') {
      const candidates = current.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
      candidates.forEach((candidate) => {
        assertSafeUrl(candidate.replace(/[),.;]+$/, ''), `${currentPath} embedded URL`);
      });
    }
  }
  inspectEmbeddedUrls(value, path);
}

export function assertProfile(profile) {
  assertAllowedKeys(
    profile,
    ['name', 'role', 'valueProposition', 'summary', 'focusAreas', 'location', 'image', 'links'],
    'profile',
  );
  if (profile.location !== undefined || profile.image !== undefined) {
    fail('profile location and image are not yet part of the owner-approved public contract.');
  }
  assertString(profile.valueProposition, 'profile.valueProposition');
  assertString(profile.summary, 'profile.summary');
  assertStringArray(profile.focusAreas, 'profile.focusAreas');
  if (profile.location !== undefined) assertString(profile.location, 'profile.location');
  if (profile.image !== undefined) assertImage(profile.image, 'profile.image');
  assertAllowedKeys(profile.links, ['email', 'linkedin', 'github'], 'profile.links');
  assertLink(profile.links.email, 'profile.links.email', 'email');
  assertLink(profile.links.linkedin, 'profile.links.linkedin', 'linkedin');
  assertLink(profile.links.github, 'profile.links.github', 'github');
  assertApprovedFields(profile, APPROVED_PROFILE_CONTRACT, 'profile');
}

function assertCapabilities(capabilities, projects) {
  if (!Array.isArray(capabilities) || capabilities.length !== APPROVED_CAPABILITY_CONTRACTS.length) {
    fail('capabilities must contain exactly the four approved groups.');
  }
  assertUniqueIds(capabilities, 'capabilities');
  const publishedProjectIds = new Set(
    projects
      .filter((project) => project.publicationStatus === 'published')
      .map((project) => project.id),
  );
  const displayOrders = new Set();

  capabilities.forEach((capability, index) => {
    const path = `capabilities[${index}]`;
    assertAllowedKeys(
      capability,
      ['id', 'title', 'description', 'evidenceProjectIds', 'displayOrder'],
      path,
    );
    assertString(capability.title, `${path}.title`);
    assertString(capability.description, `${path}.description`);
    assertStringArray(capability.evidenceProjectIds, `${path}.evidenceProjectIds`);
    if (!Number.isInteger(capability.displayOrder) || capability.displayOrder <= 0) {
      fail(`${path}.displayOrder must be a positive integer.`);
    }
    if (displayOrders.has(capability.displayOrder)) {
      fail('capabilities contains duplicate display orders.');
    }
    displayOrders.add(capability.displayOrder);
    for (const projectId of capability.evidenceProjectIds) {
      if (!publishedProjectIds.has(projectId)) {
        fail(`${path} requires published project evidence for ${projectId}.`);
      }
    }
  });

  assertApprovedFields(capabilities, APPROVED_CAPABILITY_CONTRACTS, 'capabilities');
}

export function assertProject(project, path = `projects.${project?.id ?? 'unknown'}`) {
  assertAllowedKeys(
    project,
    [
      'id',
      'title',
      'summary',
      'detailedDescription',
      'role',
      'workMode',
      'technologies',
      'categories',
      'evidenceResults',
      'repositoryUrl',
      'demoPaperUrl',
      'image',
      'featuredOrder',
      'fairnessAuditMode',
      'evaluationStatus',
      'publicationStatus',
    ],
    path,
  );
  assertKebabId(project.id, `${path}.id`);
  assertString(project.title, `${path}.title`);
  assertString(project.summary, `${path}.summary`);
  assertStringArray(project.detailedDescription, `${path}.detailedDescription`);
  assertString(project.role, `${path}.role`);
  if (!['individual', 'team'].includes(project.workMode)) fail(`${path}.workMode is invalid.`);
  assertStringArray(project.technologies, `${path}.technologies`);
  assertStringArray(project.categories, `${path}.categories`);
  for (const category of project.categories) {
    if (!PROJECT_CATEGORIES.includes(category)) fail(`${path}.categories contains ${category}.`);
  }

  if (!Array.isArray(project.evidenceResults)) fail(`${path}.evidenceResults must be an array.`);
  project.evidenceResults.forEach((evidence, index) => {
    const evidencePath = `${path}.evidenceResults[${index}]`;
    assertAllowedKeys(evidence, ['label', 'value', 'method', 'sourceUrl'], evidencePath);
    assertString(evidence.label, `${evidencePath}.label`);
    assertString(evidence.value, `${evidencePath}.value`);
    assertString(evidence.method, `${evidencePath}.method`);
    if (evidence.sourceUrl !== undefined) assertSafeUrl(evidence.sourceUrl, `${evidencePath}.sourceUrl`);
  });

  assertNullableString(project.repositoryUrl, `${path}.repositoryUrl`);
  if (project.repositoryUrl !== null) assertRepositoryUrl(project.repositoryUrl, `${path}.repositoryUrl`);
  assertNullableString(project.demoPaperUrl, `${path}.demoPaperUrl`);
  if (project.demoPaperUrl !== null) assertSafeUrl(project.demoPaperUrl, `${path}.demoPaperUrl`);

  if (project.featuredOrder !== null && ![1, 2, 3].includes(project.featuredOrder)) {
    fail(`${path}.featuredOrder must be 1, 2, 3, or null.`);
  }
  assertPublicationStatus(project.publicationStatus, `${path}.publicationStatus`);

  if (project.id === 'metamind-responsible-ai-learning-companion') {
    if (project.fairnessAuditMode !== 'user-triggered') {
      fail(`${path}.fairnessAuditMode must remain user-triggered.`);
    }
    assertAllowedKeys(
      project.evaluationStatus,
      ['learningEffectiveness', 'fairnessOutcomes'],
      `${path}.evaluationStatus`,
    );
    if (
      project.evaluationStatus.learningEffectiveness !== 'not-evaluated' ||
      project.evaluationStatus.fairnessOutcomes !== 'not-evaluated'
    ) {
      fail(`${path}.evaluationStatus must preserve both not-evaluated limitations.`);
    }
  } else if (project.fairnessAuditMode !== undefined || project.evaluationStatus !== undefined) {
    fail(`${path} must not define MetaMind-only evaluation fields.`);
  }

  if (project.image !== null) assertImage(project.image, `${path}.image`, { requireAlt: true });
  if (project.publicationStatus === 'published') {
    if (project.evidenceResults.length === 0) fail(`${path} cannot be published without approved evidence.`);
    if (!project.role.trim() || !project.workMode) {
      fail(`${path} cannot be published without complete role and work-mode information.`);
    }
  }
}

export function assertFlagshipCandidates(projects) {
  const candidates = projects
    .filter((project) => project.featuredOrder !== null)
    .slice()
    .sort((left, right) => left.featuredOrder - right.featuredOrder);

  if (candidates.length !== FLAGSHIP_PROJECTS.length) {
    fail(`Featured candidates must contain exactly ${FLAGSHIP_PROJECTS.length} records.`);
  }

  const orderSet = new Set(candidates.map((project) => project.featuredOrder));
  if (orderSet.size !== candidates.length) fail('Featured candidates contain duplicate featured orders.');

  candidates.forEach((candidate, index) => {
    const expected = FLAGSHIP_PROJECTS[index];
    if (
      candidate.id !== expected.id ||
      candidate.title !== expected.title ||
      candidate.featuredOrder !== expected.featuredOrder
    ) {
      fail(`Featured order ${index + 1} must be ${expected.id}.`);
    }
  });
}

function assertExperience(experience, path) {
  assertAllowedKeys(
    experience,
    [
      'id',
      'employer',
      'roleTitle',
      'employmentType',
      'startDate',
      'endDate',
      'location',
      'summary',
      'highlights',
      'technologies',
      'capabilityRefs',
      'confidentialityNote',
      'employerUrl',
      'publicationStatus',
    ],
    path,
  );
  assertKebabId(experience.id, `${path}.id`);
  assertString(experience.employer, `${path}.employer`);
  assertString(experience.roleTitle, `${path}.roleTitle`);
  if (!['apprenticeship', 'internship', 'employment'].includes(experience.employmentType)) {
    fail(`${path}.employmentType is invalid.`);
  }
  assertYearMonth(experience.startDate, `${path}.startDate`);
  if (experience.endDate !== null) assertYearMonth(experience.endDate, `${path}.endDate`);
  assertChronology(experience.startDate, experience.endDate, path);
  if (experience.location !== undefined) assertString(experience.location, `${path}.location`);
  assertString(experience.summary, `${path}.summary`);
  assertStringArray(experience.highlights, `${path}.highlights`);
  assertStringArray(experience.technologies, `${path}.technologies`);
  assertStringArray(experience.capabilityRefs, `${path}.capabilityRefs`);
  for (const capability of experience.capabilityRefs) {
    if (!PROJECT_CATEGORIES.includes(capability)) fail(`${path}.capabilityRefs contains ${capability}.`);
  }
  if (experience.confidentialityNote !== undefined) {
    assertString(experience.confidentialityNote, `${path}.confidentialityNote`);
  }
  if (experience.employerUrl !== undefined) assertSafeUrl(experience.employerUrl, `${path}.employerUrl`);
  assertPublicationStatus(experience.publicationStatus, `${path}.publicationStatus`);
}

function assertExperienceDisclosure(experiences) {
  const ayming = experiences.find((record) => record.employer === 'Ayming');
  const vroomVroom = experiences.find((record) => record.employer === 'VroomVroom');
  if (!ayming || !vroomVroom) fail('Experience must contain the approved Ayming and VroomVroom records.');

  const aymingText = JSON.stringify(ayming);
  if (
    /(?:\b60\s*%(?!\w)|\b60\s*(?:percent|per[\s-]?cent)\b|\bsixty[\s-]*(?:percent|per[\s-]?cent)\b)/i.test(
      aymingText,
    )
  ) {
    fail('The unapproved Ayming metric must not be published.');
  }

  if (/\b(personal|individual)\s+project\b/i.test(JSON.stringify(vroomVroom))) {
    fail('VroomVroom must not be represented as a personal or individual project.');
  }
}

function assertSkillGroups(skillGroups, projects, experiences) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) fail('skills must be a non-empty array.');
  assertUniqueIds(skillGroups, 'skills');
  const displayOrders = new Set();
  const projectIds = new Set(projects.map((project) => project.id));
  const experienceIds = new Set(experiences.map((experience) => experience.id));
  const publishedProjectIds = new Set(
    projects
      .filter((project) => project.publicationStatus === 'published')
      .map((project) => project.id),
  );
  const publishedExperienceIds = new Set(
    experiences
      .filter((experience) => experience.publicationStatus === 'published')
      .map((experience) => experience.id),
  );

  skillGroups.forEach((group, groupIndex) => {
    const path = `skills[${groupIndex}]`;
    assertAllowedKeys(group, ['id', 'title', 'description', 'skills', 'displayOrder'], path);
    assertString(group.title, `${path}.title`);
    if (group.description !== undefined) assertString(group.description, `${path}.description`);
    if (!Number.isInteger(group.displayOrder) || group.displayOrder <= 0) {
      fail(`${path}.displayOrder must be a positive integer.`);
    }
    if (displayOrders.has(group.displayOrder)) fail('skills contains duplicate display orders.');
    displayOrders.add(group.displayOrder);
    if (!Array.isArray(group.skills) || group.skills.length === 0) fail(`${path}.skills must be non-empty.`);

    group.skills.forEach((skill, skillIndex) => {
      const skillPath = `${path}.skills[${skillIndex}]`;
      assertAllowedKeys(
        skill,
        ['name', 'evidenceProjectIds', 'evidenceExperienceIds', 'context'],
        skillPath,
      );
      assertString(skill.name, `${skillPath}.name`);
      assertStringArray(skill.evidenceProjectIds, `${skillPath}.evidenceProjectIds`, { allowEmpty: true });
      assertStringArray(skill.evidenceExperienceIds, `${skillPath}.evidenceExperienceIds`, {
        allowEmpty: true,
      });
      if (skill.evidenceProjectIds.length + skill.evidenceExperienceIds.length === 0) {
        fail(`${skillPath} requires approved project or experience evidence.`);
      }
      for (const projectId of skill.evidenceProjectIds) {
        if (!projectIds.has(projectId)) fail(`${skillPath} has broken project reference ${projectId}.`);
      }
      for (const experienceId of skill.evidenceExperienceIds) {
        if (!experienceIds.has(experienceId)) {
          fail(`${skillPath} has broken experience reference ${experienceId}.`);
        }
      }
      const hasPublishedEvidence =
        skill.evidenceProjectIds.some((projectId) => publishedProjectIds.has(projectId)) ||
        skill.evidenceExperienceIds.some((experienceId) =>
          publishedExperienceIds.has(experienceId),
        );
      if (!hasPublishedEvidence) {
        fail(`${skillPath} requires at least one published evidence reference.`);
      }
      if (skill.context !== undefined) assertString(skill.context, `${skillPath}.context`);
    });
  });
}

function assertCertifications(certifications) {
  if (!Array.isArray(certifications) || certifications.length !== FEATURED_CERTIFICATIONS.length) {
    fail('certifications must contain exactly the three approved records.');
  }
  assertUniqueIds(certifications, 'certifications');
  const sorted = certifications.slice().sort((left, right) => left.featuredOrder - right.featuredOrder);

  sorted.forEach((certification, index) => {
    const path = `certifications[${index}]`;
    assertAllowedKeys(
      certification,
      [
        'id',
        'title',
        'issuer',
        'issuedDate',
        'expiresDate',
        'credentialUrl',
        'image',
        'featuredOrder',
        'publicationStatus',
      ],
      path,
    );
    const expected = FEATURED_CERTIFICATIONS[index];
    if (
      certification.id !== expected.id ||
      certification.title !== expected.title ||
      certification.issuer !== expected.issuer ||
      certification.featuredOrder !== expected.featuredOrder
    ) {
      fail(`Certification order ${index + 1} does not match the approved record.`);
    }
    if (certification.issuedDate !== undefined) assertYearMonth(certification.issuedDate, `${path}.issuedDate`);
    if (certification.expiresDate !== undefined) {
      assertYearMonth(certification.expiresDate, `${path}.expiresDate`);
      if (certification.issuedDate && certification.expiresDate < certification.issuedDate) {
        fail(`${path}.expiresDate precedes its issue date.`);
      }
    }
    assertNullableString(certification.credentialUrl, `${path}.credentialUrl`);
    if (certification.credentialUrl !== null) {
      assertSafeUrl(certification.credentialUrl, `${path}.credentialUrl`);
    }
    if (certification.image !== undefined) assertImage(certification.image, `${path}.image`);
    assertPublicationStatus(certification.publicationStatus, `${path}.publicationStatus`);
    assertApprovedFields(certification, APPROVED_CERTIFICATION_CONTRACTS[index], path);
  });
}

function assertEducation(education) {
  if (!Array.isArray(education) || education.length !== 2) {
    fail('education must contain exactly the two approved records.');
  }
  assertUniqueIds(education, 'education');
  education.forEach((record, index) => {
    const path = `education[${index}]`;
    assertAllowedKeys(
      record,
      [
        'id',
        'institution',
        'program',
        'startDate',
        'endDate',
        'location',
        'summary',
        'highlights',
        'image',
        'publicationStatus',
      ],
      path,
    );
    assertString(record.institution, `${path}.institution`);
    assertString(record.program, `${path}.program`);
    assertYear(record.startDate, `${path}.startDate`);
    if (record.endDate !== null) assertYear(record.endDate, `${path}.endDate`);
    assertChronology(record.startDate, record.endDate, path);
    assertString(record.location, `${path}.location`);
    if (record.summary !== undefined) assertString(record.summary, `${path}.summary`);
    if (record.highlights !== undefined) assertStringArray(record.highlights, `${path}.highlights`);
    if (record.image !== undefined) assertImage(record.image, `${path}.image`);
    assertPublicationStatus(record.publicationStatus, `${path}.publicationStatus`);
    const approved = APPROVED_EDUCATION_CONTRACTS.find(({ id }) => id === record.id);
    if (!approved) fail(`${path}.id is not owner-approved.`);
    assertApprovedFields(record, approved, path);
  });
}

function assertProjectCollection(projects) {
  if (!Array.isArray(projects) || projects.length !== APPROVED_PROJECT_CONTRACTS.length) {
    fail('projects must contain exactly the three owner-approved flagship records.');
  }
  assertUniqueIds(projects, 'projects');
  projects.forEach((project, index) => assertProject(project, `projects[${index}]`));
  assertFlagshipCandidates(projects);
  if (projects.some((project) => project.publicationStatus !== 'published')) {
    fail('Milestone 4 requires exactly the three approved flagship projects to be published.');
  }

  const metaMind = projects.find(
    (project) => project.id === 'metamind-responsible-ai-learning-companion',
  );
  if (
    /(?:continuous(?:ly)?|automatic(?:ally)?|ongoing|always[-\s]?on|scheduled)[^.!?]{0,80}fairness|fairness[^.!?]{0,80}(?:continuous(?:ly)?|automatic(?:ally)?|ongoing|always[-\s]?on|scheduled)/i.test(
      JSON.stringify(metaMind),
    )
  ) {
    fail('MetaMind must not claim continuous, automatic, ongoing, always-on, or scheduled fairness auditing.');
  }
  if (projects.some((project) => /vroomvroom/i.test(JSON.stringify(project)))) {
    fail('VroomVroom must remain professional experience, not a project record.');
  }
  for (const approved of APPROVED_PROJECT_CONTRACTS) {
    const index = projects.findIndex(({ id }) => id === approved.id);
    if (index === -1) fail(`projects is missing owner-approved record ${approved.id}.`);
    assertApprovedFields(projects[index], approved, `projects[${index}]`, {
      allowedExtraKeys: ['image', 'publicationStatus'],
    });
  }
}

function assertExperienceCollection(experiences) {
  if (!Array.isArray(experiences) || experiences.length !== 2) {
    fail('experience must contain exactly the approved Ayming and VroomVroom records.');
  }
  assertUniqueIds(experiences, 'experience');
  experiences.forEach((experience, index) => assertExperience(experience, `experience[${index}]`));
  assertExperienceDisclosure(experiences);
  for (const approved of APPROVED_EXPERIENCE_CONTRACTS) {
    const index = experiences.findIndex(({ id }) => id === approved.id);
    if (index === -1) fail(`experience is missing owner-approved record ${approved.id}.`);
    assertApprovedFields(experiences[index], approved, `experience[${index}]`);
  }
}

export function validatePortfolioData(data) {
  assertAllowedKeys(
    data,
    ['profile', 'capabilities', 'projects', 'experience', 'skills', 'certifications', 'education'],
    'portfolioData',
  );
  assertPublishSafeTree(data);
  assertProfile(data.profile);
  assertProjectCollection(data.projects);
  assertCapabilities(data.capabilities, data.projects);
  assertExperienceCollection(data.experience);
  assertSkillGroups(data.skills, data.projects, data.experience);
  assertCertifications(data.certifications);
  assertEducation(data.education);
  return true;
}
