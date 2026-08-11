import { useEffect, useRef } from 'react';

const navigationItems = [
  { id: 'home', href: '/', label: 'Home' },
  { id: 'projects', href: '/projects/', label: 'Projects' },
];

export function NavigationMenu({ currentPage, onHydrated }) {
  const disclosureRef = useRef(null);

  useEffect(() => {
    onHydrated?.();
  }, [onHydrated]);

  function closeDisclosure() {
    disclosureRef.current?.removeAttribute('open');
  }

  return (
    <nav className="site-nav" aria-label="Primary">
      <details className="site-nav__disclosure" ref={disclosureRef}>
        <summary className="site-nav__summary">Menu</summary>
        <ul className="site-nav__list">
          {navigationItems.map((item) => (
            <li key={item.id}>
              <a
                className="site-nav__link"
                href={item.href}
                aria-current={currentPage === item.id ? 'page' : undefined}
                onClick={closeDisclosure}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
