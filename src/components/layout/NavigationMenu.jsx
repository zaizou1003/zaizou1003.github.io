import { useEffect, useRef } from 'react';
import { getPrimaryNavigationItems } from './navigation.js';

function NavigationLinks({ items, location, onLinkActivation }) {
  const locationAttribute =
    location === 'mobile'
      ? { 'data-mobile-nav-links': '' }
      : { 'data-desktop-nav-links': '' };

  return (
    <ul className={`site-nav__list site-nav__list--${location}`} {...locationAttribute}>
      {items.map((item) => (
        <li key={item.id}>
          <a
            className="site-nav__link"
            href={item.href}
            aria-current={item.current ? 'page' : undefined}
            data-nav-id={item.id}
            onClick={onLinkActivation}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function NavigationMenu({ currentPage, onHydrated }) {
  const disclosureRef = useRef(null);
  const summaryRef = useRef(null);
  const navigationItems = getPrimaryNavigationItems(currentPage);

  useEffect(() => {
    onHydrated?.();
  }, [onHydrated]);

  function closeDisclosure({ restoreFocus = false } = {}) {
    const disclosure = disclosureRef.current;
    const summary = summaryRef.current;

    if (!disclosure?.open) return;
    disclosure.open = false;

    if (restoreFocus && summary && window.getComputedStyle(summary).display !== 'none') {
      summary.focus({ preventScroll: true });
    }
  }

  function handleKeyDown(event) {
    if (event.key !== 'Escape' || !disclosureRef.current?.open) return;
    event.preventDefault();
    closeDisclosure({ restoreFocus: true });
  }

  function handleLinkActivation() {
    const summary = summaryRef.current;
    const isMobileDisclosure = summary && window.getComputedStyle(summary).display !== 'none';
    closeDisclosure({ restoreFocus: Boolean(isMobileDisclosure) });
  }

  return (
    <nav className="site-nav" aria-label="Primary">
      <details
        className="site-nav__disclosure"
        ref={disclosureRef}
        onKeyDown={handleKeyDown}
      >
        <summary
          className="site-nav__summary"
          ref={summaryRef}
          aria-controls="primary-navigation-links"
        >
          Menu
        </summary>
        <div id="primary-navigation-links">
          <NavigationLinks
            items={navigationItems}
            location="mobile"
            onLinkActivation={handleLinkActivation}
          />
        </div>
      </details>
      <NavigationLinks
        items={navigationItems}
        location="desktop"
        onLinkActivation={handleLinkActivation}
      />
    </nav>
  );
}
