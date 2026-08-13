import {
  CERTIFICATION_COUNT,
  FEATURED_CERTIFICATIONS,
  FLAGSHIP_PROJECTS,
  assertCertifications,
  assertFlagshipCandidates,
} from './schemas.js';

function compareText(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

export function assertFeaturedContract(featuredProjects) {
  if (!Array.isArray(featuredProjects) || featuredProjects.length !== FLAGSHIP_PROJECTS.length) {
    throw new Error(`Published featured projects must contain exactly ${FLAGSHIP_PROJECTS.length} records.`);
  }

  featuredProjects.forEach((project, index) => {
    const expected = FLAGSHIP_PROJECTS[index];
    if (project.publicationStatus !== 'published') {
      throw new Error(`Featured project ${project.id} is not published.`);
    }
    if (
      project.id !== expected.id ||
      project.title !== expected.title ||
      project.featuredOrder !== expected.featuredOrder
    ) {
      throw new Error(`Published featured order ${index + 1} must be ${expected.id}.`);
    }
  });

  return true;
}

export function selectFeaturedCandidates(projectRecords) {
  assertFlagshipCandidates(projectRecords);
  return projectRecords
    .filter((project) => Number.isInteger(project.featuredOrder))
    .slice()
    .sort((left, right) => left.featuredOrder - right.featuredOrder);
}

export function selectFeaturedProjects(projectRecords) {
  const featured = projectRecords
    .filter(
      (project) =>
        project.publicationStatus === 'published' && Number.isInteger(project.featuredOrder),
    )
    .slice()
    .sort((left, right) => left.featuredOrder - right.featuredOrder);

  if (featured.length === 0) return [];
  assertFeaturedContract(featured);
  return featured;
}

export function selectPublishedProjects(projectRecords) {
  return projectRecords
    .filter((project) => project.publicationStatus === 'published')
    .slice()
    .sort((left, right) => {
      const leftOrder = left.featuredOrder ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.featuredOrder ?? Number.POSITIVE_INFINITY;
      return leftOrder - rightOrder || compareText(left.title, right.title) || compareText(left.id, right.id);
    });
}

export function selectSelectedWorkProjects(projectRecords) {
  return selectPublishedProjects(projectRecords).filter(
    (project) => project.featuredOrder === null,
  );
}

export function selectPublishedExperience(experienceRecords) {
  return experienceRecords
    .filter((record) => record.publicationStatus === 'published')
    .slice()
    .sort(
      (left, right) =>
        right.startDate.localeCompare(left.startDate) || compareText(left.employer, right.employer),
    );
}

export function selectSkillGroups(skillGroups) {
  return skillGroups
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder || compareText(left.title, right.title));
}

export function selectPublishedSkillGroups(skillGroups, projectRecords, experienceRecords) {
  const publishedProjectIds = new Set(
    projectRecords
      .filter((project) => project.publicationStatus === 'published')
      .map((project) => project.id),
  );
  const publishedExperienceIds = new Set(
    experienceRecords
      .filter((experience) => experience.publicationStatus === 'published')
      .map((experience) => experience.id),
  );

  return selectSkillGroups(skillGroups)
    .map((group) => ({
      ...group,
      skills: group.skills.filter(
        (skill) =>
          skill.evidenceProjectIds.some((projectId) => publishedProjectIds.has(projectId)) ||
          skill.evidenceExperienceIds.some((experienceId) =>
            publishedExperienceIds.has(experienceId),
          ),
      ),
    }))
    .filter((group) => group.skills.length > 0);
}

export function selectCapabilities(capabilityRecords) {
  return capabilityRecords
    .slice()
    .sort(
      (left, right) =>
        left.displayOrder - right.displayOrder || compareText(left.title, right.title),
    );
}

function selectFeaturedCertificationsFromValidated(certificationRecords) {
  return certificationRecords
    .filter(
      (record) =>
        record.publicationStatus === 'published' && Number.isInteger(record.featuredOrder),
    )
    .slice()
    .sort((left, right) => left.featuredOrder - right.featuredOrder);
}

function selectRemainingCertificationsFromValidated(certificationRecords) {
  return certificationRecords
    .filter(
      (record) => record.publicationStatus === 'published' && record.featuredOrder === null,
    )
    .slice()
    .sort(
      (left, right) =>
        right.issuedDate.localeCompare(left.issuedDate) ||
        compareText(left.issuer, right.issuer) ||
        compareText(left.title, right.title) ||
        compareText(left.id, right.id),
    );
}

export function selectFeaturedCertifications(certificationRecords) {
  assertCertifications(certificationRecords);
  const featured = selectFeaturedCertificationsFromValidated(certificationRecords);

  if (featured.length !== FEATURED_CERTIFICATIONS.length) {
    throw new Error(`Published featured certifications must contain exactly ${FEATURED_CERTIFICATIONS.length} records.`);
  }
  featured.forEach((record, index) => {
    const expected = FEATURED_CERTIFICATIONS[index];
    if (
      record.id !== expected.id ||
      record.title !== expected.title ||
      record.issuer !== expected.issuer ||
      record.featuredOrder !== expected.featuredOrder
    ) {
      throw new Error(`Published featured certification order ${index + 1} must be ${expected.id}.`);
    }
  });
  return featured;
}

export function selectRemainingCertifications(certificationRecords) {
  assertCertifications(certificationRecords);
  const remaining = selectRemainingCertificationsFromValidated(certificationRecords);

  const expectedCount = CERTIFICATION_COUNT - FEATURED_CERTIFICATIONS.length;
  if (remaining.length !== expectedCount) {
    throw new Error(`Published remaining certifications must contain exactly ${expectedCount} records.`);
  }
  return remaining;
}

export function selectPublishedCertifications(certificationRecords) {
  assertCertifications(certificationRecords);
  const featured = selectFeaturedCertificationsFromValidated(certificationRecords);
  const remaining = selectRemainingCertificationsFromValidated(certificationRecords);
  const published = certificationRecords.filter(
    (record) => record.publicationStatus === 'published',
  );
  const combined = [...featured, ...remaining];
  const combinedIds = new Set(combined.map((record) => record.id));
  const publishedIds = new Set(published.map((record) => record.id));

  if (
    combined.length !== CERTIFICATION_COUNT ||
    combinedIds.size !== combined.length ||
    publishedIds.size !== published.length ||
    published.length !== combined.length ||
    [...publishedIds].some((id) => !combinedIds.has(id))
  ) {
    throw new Error('Published certification partition must contain every approved record exactly once.');
  }
  return combined;
}

export function selectPublishedEducation(educationRecords) {
  return educationRecords
    .filter((record) => record.publicationStatus === 'published')
    .slice()
    .sort(
      (left, right) =>
        (right.endDate ?? '9999').localeCompare(left.endDate ?? '9999') ||
        right.startDate.localeCompare(left.startDate) ||
        compareText(left.institution, right.institution),
    );
}
