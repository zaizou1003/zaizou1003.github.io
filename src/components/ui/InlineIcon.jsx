import { iconDefinitions } from './iconPaths.js';

export function InlineIcon({ name, className = '' }) {
  const definition = iconDefinitions[name];

  if (!definition) {
    throw new Error(`Unsupported inline icon: ${name}`);
  }

  return (
    <svg
      className={`inline-icon${className ? ` ${className}` : ''}`}
      viewBox={definition.viewBox}
      aria-hidden="true"
      focusable="false"
      fill={definition.fill ? 'currentColor' : 'none'}
      stroke={definition.fill ? 'none' : 'currentColor'}
      strokeWidth={definition.fill ? undefined : '1.75'}
      strokeLinecap={definition.fill ? undefined : 'round'}
      strokeLinejoin={definition.fill ? undefined : 'round'}
    >
      {definition.paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
