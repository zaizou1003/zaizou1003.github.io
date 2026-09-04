const homeSections = Object.freeze([
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'featured-projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'education', label: 'Education' },
  { id: 'contact', label: 'Contact' },
]);

const supportedPages = new Set(['home', 'projects']);

export function getPrimaryNavigationItems(currentPage) {
  if (!supportedPages.has(currentPage)) {
    throw new Error(`Unsupported navigation page: ${currentPage}`);
  }

  const homepagePrefix = currentPage === 'home' ? '' : '/';
  const sectionItems = homeSections.map((item) =>
    Object.freeze({
      ...item,
      href: `${homepagePrefix}#${item.id}`,
      current: false,
    }),
  );

  return Object.freeze([
    ...sectionItems,
    Object.freeze({
      id: 'all-projects',
      href: '/projects/',
      label: 'All projects',
      current: currentPage === 'projects',
    }),
  ]);
}
