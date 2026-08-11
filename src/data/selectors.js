import { FLAGSHIP_PROJECTS, assertFlagshipCandidates } from './schemas.js';

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

export function selectFeaturedCertifications(certificationRecords) {
  return certificationRecords
    .filter((record) => record.publicationStatus === 'published')
    .slice()
    .sort((left, right) => left.featuredOrder - right.featuredOrder);
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
