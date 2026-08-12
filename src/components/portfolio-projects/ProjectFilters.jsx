import { ALL_PROJECTS_CATEGORY } from '../../utils/projectFilters.js';
import { getProjectCategoryLabel } from '../../utils/projectPresentation.js';
import styles from './ProjectFilters.module.css';

export function ProjectFilters({
  activeCategory,
  availableCategories,
  enhanced,
  onSelectCategory,
  view,
}) {
  const filterCategories = [ALL_PROJECTS_CATEGORY, ...availableCategories];

  return (
    <div className={styles.region}>
      <div className={styles.controls} data-project-filter-controls="" hidden={!enhanced}>
        <fieldset>
          <legend>Filter projects by category</legend>
          <div className={styles.buttons}>
            {filterCategories.map((category) => (
              <button
                className={styles.button}
                type="button"
                aria-pressed={activeCategory === category}
                data-project-filter={category}
                key={category}
                onClick={() => onSelectCategory(category)}
              >
                {category === ALL_PROJECTS_CATEGORY
                  ? 'All'
                  : getProjectCategoryLabel(category)}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <p
        className={styles.status}
        data-project-results-status=""
        aria-live={enhanced ? 'polite' : undefined}
        aria-atomic={enhanced ? 'true' : undefined}
      >
        {view.announcement}
      </p>

      {view.isEmpty ? (
        <div className={styles.empty} data-project-empty-state="">
          <p>No published projects match this filter.</p>
          {view.showClear ? (
            <button
              className={styles.clearButton}
              type="button"
              onClick={() => onSelectCategory(ALL_PROJECTS_CATEGORY)}
            >
              Clear filter
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
