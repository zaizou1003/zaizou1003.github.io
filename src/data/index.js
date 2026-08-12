import { capabilities } from './capabilities.js';
import { certifications } from './certifications.js';
import { education } from './education.js';
import { experience } from './experience.js';
import { profile } from './profile.js';
import { projects } from './projects.js';
import { skills } from './skills.js';
import { deepFreeze } from './schemas.js';

export { capabilities } from './capabilities.js';
export { certifications } from './certifications.js';
export { education } from './education.js';
export { experience } from './experience.js';
export { profile } from './profile.js';
export { projects } from './projects.js';
export { skills } from './skills.js';
export * from './schemas.js';
export * from './selectors.js';

export const portfolioData = deepFreeze({
  profile,
  capabilities,
  projects,
  experience,
  skills,
  certifications,
  education,
});
