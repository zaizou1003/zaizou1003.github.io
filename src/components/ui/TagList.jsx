export function TagList({ items, label }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <ul className="tag-list" aria-label={label}>
      {items.map((item) => (
        <li className="tag-list__item" key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}
