import { PROJECT_CATEGORIES } from '../data/schemas.js';
import { selectPublishedProjects } from '../data/selectors.js';

export const ALL_PROJECTS_CATEGORY = 'all';

function normalizeHash(hash, projectIds) {
  if (!hash || hash === '#') return { hash: '', projectId: null };

  try {
    const projectId = decodeURIComponent(hash.slice(1));
    if (projectIds.has(projectId)) return { hash: `#${projectId}`, projectId };
  } catch {
    // Malformed or unknown fragments do not participate in filter state.
  }

  return { hash, projectId: null };
}

export function getAvailableProjectCategories(projectRecords) {
  const publishedProjects = selectPublishedProjects(projectRecords);
  const projectCount = publishedProjects.length;

  if (projectCount < 2) return [];

  return PROJECT_CATEGORIES.filter((category) => {
    const categoryCount = publishedProjects.filter((project) =>
      project.categories.includes(category),
    ).length;
    return categoryCount > 0 && categoryCount < projectCount;
  });
}

export function isAvailableProjectCategory(category, availableCategories) {
  return availableCategories.includes(category);
}

export function filterPublishedProjects(projectRecords, category) {
  const publishedProjects = selectPublishedProjects(projectRecords);
  if (category === ALL_PROJECTS_CATEGORY) return publishedProjects;
  return publishedProjects.filter((project) => project.categories.includes(category));
}

export function getProjectFilterView(projectRecords, category) {
  const publishedProjects = selectPublishedProjects(projectRecords);
  const visibleProjects = filterPublishedProjects(publishedProjects, category);
  const resultCount = visibleProjects.length;
  const totalCount = publishedProjects.length;

  return Object.freeze({
    category,
    visibleProjects,
    resultCount,
    totalCount,
    isEmpty: resultCount === 0,
    showClear: category !== ALL_PROJECTS_CATEGORY && resultCount === 0,
    announcement: `Showing ${resultCount} of ${totalCount} ${totalCount === 1 ? 'project' : 'projects'}.`,
  });
}

export function parseProjectCategory(search, availableCategories) {
  if (!search || search === '?') {
    return Object.freeze({ category: ALL_PROJECTS_CATEGORY, shouldNormalize: false });
  }

  let parameters;
  try {
    parameters = new URLSearchParams(search);
  } catch {
    return Object.freeze({ category: ALL_PROJECTS_CATEGORY, shouldNormalize: true });
  }

  const entries = [...parameters.entries()];
  const categoryValues = parameters.getAll('category');
  const isExactCategoryParameter =
    entries.length === 1 && entries[0][0] === 'category' && categoryValues.length === 1;
  const category = categoryValues[0];

  if (
    isExactCategoryParameter &&
    category &&
    isAvailableProjectCategory(category, availableCategories)
  ) {
    return Object.freeze({ category, shouldNormalize: false });
  }

  return Object.freeze({ category: ALL_PROJECTS_CATEGORY, shouldNormalize: true });
}

export function createProjectFilterHref(category, availableCategories, hash = '') {
  const safeCategory =
    category === ALL_PROJECTS_CATEGORY ||
    isAvailableProjectCategory(category, availableCategories)
      ? category
      : ALL_PROJECTS_CATEGORY;
  const query =
    safeCategory === ALL_PROJECTS_CATEGORY
      ? ''
      : `?${new URLSearchParams({ category: safeCategory }).toString()}`;
  return `/projects/${query}${hash}`;
}

export function resolveProjectLocation(search, hash, projectRecords, availableCategories) {
  const publishedProjects = selectPublishedProjects(projectRecords);
  const projectIds = new Set(publishedProjects.map((project) => project.id));
  const parsed = parseProjectCategory(search, availableCategories);
  const fragment = normalizeHash(hash, projectIds);
  let category = parsed.category;
  let shouldNormalize = parsed.shouldNormalize;

  if (fragment.projectId && category !== ALL_PROJECTS_CATEGORY) {
    const target = publishedProjects.find((project) => project.id === fragment.projectId);
    if (!target.categories.includes(category)) {
      category = ALL_PROJECTS_CATEGORY;
      shouldNormalize = true;
    }
  }

  const canonicalHash = shouldNormalize ? fragment.projectId ? fragment.hash : '' : hash;

  return Object.freeze({
    category,
    shouldNormalize,
    href: createProjectFilterHref(category, availableCategories, canonicalHash),
    projectId: fragment.projectId,
  });
}
