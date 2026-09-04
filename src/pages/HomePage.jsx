import { Capabilities } from '../components/sections/Capabilities.jsx';
import { Certifications } from '../components/sections/Certifications.jsx';
import { ContactLinks } from '../components/sections/ContactLinks.jsx';
import { Education } from '../components/sections/Education.jsx';
import { Experience } from '../components/sections/Experience.jsx';
import { FeaturedProjects } from '../components/sections/FeaturedProjects.jsx';
import { Hero } from '../components/sections/Hero.jsx';
import { SelectedWork } from '../components/sections/SelectedWork.jsx';
import { Skills } from '../components/sections/Skills.jsx';
import { SiteShell } from '../components/layout/SiteShell.jsx';
import { capabilities } from '../data/capabilities.js';
import { certifications } from '../data/certifications.js';
import { education } from '../data/education.js';
import { experience } from '../data/experience.js';
import { profile } from '../data/profile.js';
import { projects } from '../data/projects.js';
import {
  selectCapabilities,
  selectFeaturedCertifications,
  selectFeaturedProjects,
  selectPublishedEducation,
  selectPublishedExperience,
  selectPublishedSkillGroups,
  selectRemainingCertifications,
  selectSelectedWorkProjects,
} from '../data/selectors.js';
import { skills } from '../data/skills.js';

export function HomePage() {
  const featuredProjects = selectFeaturedProjects(projects);

  return (
    <SiteShell currentPage="home" pageId="home" profile={profile}>
      <Hero profile={profile} />
      <Capabilities
        capabilities={selectCapabilities(capabilities)}
        projects={featuredProjects}
      />
      <FeaturedProjects projects={featuredProjects} />
      <Experience experiences={selectPublishedExperience(experience)} />
      <SelectedWork projects={selectSelectedWorkProjects(projects)} />
      <Skills groups={selectPublishedSkillGroups(skills, projects, experience)} />
      <Certifications
        featuredCertifications={selectFeaturedCertifications(certifications)}
        remainingCertifications={selectRemainingCertifications(certifications)}
      />
      <Education education={selectPublishedEducation(education)} />
      <ContactLinks links={profile.links} />
    </SiteShell>
  );
}
