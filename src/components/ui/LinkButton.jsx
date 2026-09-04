import { InlineIcon } from './InlineIcon.jsx';

export function LinkButton({ children, href, icon = 'arrow', variant = 'primary' }) {
  const className = `link-button link-button--${variant}`;

  return (
    <a className={className} href={href}>
      <span>{children}</span>
      {icon ? <InlineIcon name={icon} /> : null}
    </a>
  );
}
