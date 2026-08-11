import { hydrateRoot } from 'react-dom/client';
import { NavigationMenu } from '../components/layout/NavigationMenu.jsx';

export function hydrateNavigation(expectedPage) {
  const container = document.querySelector('[data-hydrate-navigation]');

  if (!container) {
    throw new Error('Navigation hydration container is missing.');
  }

  const currentPage = container.dataset.currentPage;

  if (currentPage !== expectedPage) {
    throw new Error(
      `Navigation hydration page mismatch: expected ${expectedPage}, received ${currentPage}.`,
    );
  }

  function markHydrated() {
    if (container.dataset.hydrationStatus !== 'error') {
      container.dataset.hydrationStatus = 'complete';
    }
  }

  hydrateRoot(
    container,
    <NavigationMenu currentPage={currentPage} onHydrated={markHydrated} />,
    {
    onRecoverableError(error) {
      container.dataset.hydrationStatus = 'error';
      console.error('Hydration recoverable error:', error);
    },
    },
  );
}
