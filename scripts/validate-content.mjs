import {
  portfolioData,
  selectFeaturedCandidates,
  selectFeaturedProjects,
  selectPublishedProjects,
  validatePortfolioData,
} from '../src/data/index.js';

validatePortfolioData(portfolioData);

const featuredCandidates = selectFeaturedCandidates(portfolioData.projects);
const publicFeatured = selectFeaturedProjects(portfolioData.projects);
const publicProjects = selectPublishedProjects(portfolioData.projects);

if (publicFeatured.length !== 0 || publicProjects.length !== 0) {
  throw new Error('Milestone 2 project records must remain excluded from public selectors.');
}

console.log(
  JSON.stringify(
    {
      status: 'validated',
      records: {
        profile: 1,
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
    },
    null,
    2,
  ),
);
