import { useEffect, useMemo, useState } from 'react';
import {
  ALL_PROJECTS_CATEGORY,
  createProjectFilterHref,
  getProjectFilterView,
  isAvailableProjectCategory,
  resolveProjectLocation,
} from '../../utils/projectFilters.js';
import { ProjectArticle } from './ProjectArticle.jsx';
import { ProjectFilters } from './ProjectFilters.jsx';
import styles from './ProjectsExplorer.module.css';

export function ProjectsExplorer({ availableCategories, onHydrated, projects }) {
  const [activeCategory, setActiveCategory] = useState(ALL_PROJECTS_CATEGORY);
  const [enhanced, setEnhanced] = useState(false);
  const view = useMemo(
    () => getProjectFilterView(projects, activeCategory),
    [activeCategory, projects],
  );

  useEffect(() => {
    if (onHydrated?.() === false) return undefined;

    function applyLocation() {
      const resolved = resolveProjectLocation(
        window.location.search,
        window.location.hash,
        projects,
        availableCategories,
      );
      setActiveCategory(resolved.category);
      setEnhanced(true);
      if (resolved.shouldNormalize) window.history.replaceState(null, '', resolved.href);
    }

    applyLocation();
    window.addEventListener('popstate', applyLocation);
    return () => window.removeEventListener('popstate', applyLocation);
  }, [availableCategories, onHydrated, projects]);

  function handleSelectCategory(category) {
    const normalizedCategory =
      category === ALL_PROJECTS_CATEGORY ||
      isAvailableProjectCategory(category, availableCategories)
        ? category
        : ALL_PROJECTS_CATEGORY;
    const href = createProjectFilterHref(normalizedCategory, availableCategories);
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    setActiveCategory(normalizedCategory);
    if (currentHref !== href) window.history.pushState(null, '', href);
  }

  return (
    <section className={styles.explorer} aria-labelledby="published-projects-title">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Evidence-reviewed portfolio</p>
        <h2 id="published-projects-title">Published project case studies</h2>
        <p>
          Explore the systems, implementation boundaries and evidence currently approved for
          public review.
        </p>
      </div>

      <ProjectFilters
        activeCategory={activeCategory}
        availableCategories={availableCategories}
        enhanced={enhanced}
        onSelectCategory={handleSelectCategory}
        view={view}
      />

      <ol className={styles.list} data-project-article-list="">
        {view.visibleProjects.map((project) => (
          <li key={project.id}>
            <ProjectArticle project={project} />
          </li>
        ))}
      </ol>
    </section>
  );
}
