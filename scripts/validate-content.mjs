import {
  portfolioData,
  selectFeaturedCandidates,
  selectFeaturedCertifications,
  selectFeaturedProjects,
  selectPublishedCertifications,
  selectPublishedProjects,
  selectRemainingCertifications,
  validatePortfolioData,
} from '../src/data/index.js';

validatePortfolioData(portfolioData);

const featuredCandidates = selectFeaturedCandidates(portfolioData.projects);
const publicFeatured = selectFeaturedProjects(portfolioData.projects);
const publicProjects = selectPublishedProjects(portfolioData.projects);
const featuredCertifications = selectFeaturedCertifications(portfolioData.certifications);
const remainingCertifications = selectRemainingCertifications(portfolioData.certifications);
const publicCertifications = selectPublishedCertifications(portfolioData.certifications);

if (
  publicFeatured.length !== 3 ||
  publicProjects.length !== 3 ||
  publicFeatured.some((project, index) => project.id !== featuredCandidates[index]?.id)
) {
  throw new Error('Milestone 4 must publish exactly the three approved flagship projects in order.');
}

if (
  featuredCertifications.length !== 3 ||
  remainingCertifications.length !== 8 ||
  publicCertifications.length !== 11 ||
  publicCertifications.some(
    (record, index) =>
      record.id !== [...featuredCertifications, ...remainingCertifications][index]?.id,
  )
) {
  throw new Error('Milestone 7.5 must publish exactly three featured and eight remaining certifications.');
}

console.log(
  JSON.stringify(
    {
      status: 'validated',
      records: {
        profile: 1,
        capabilities: portfolioData.capabilities.length,
        projects: portfolioData.projects.length,
        experience: portfolioData.experience.length,
        skillGroups: portfolioData.skills.length,
        skills: portfolioData.skills.reduce((total, group) => total + group.skills.length, 0),
        certifications: portfolioData.certifications.length,
        education: portfolioData.education.length,
      },
      featuredCandidateIds: featuredCandidates.map((project) => project.id),
      publicProjects: publicProjects.length,
      publicFeaturedProjects: publicFeatured.length,
      publicCertifications: publicCertifications.length,
      featuredCertifications: featuredCertifications.length,
      remainingCertifications: remainingCertifications.length,
    },
    null,
    2,
  ),
);
