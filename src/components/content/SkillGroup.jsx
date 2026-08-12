import { TagList } from '../ui/TagList.jsx';

export function SkillGroup({ group }) {
  return (
    <article className="content-card skill-group" data-skill-group-id={group.id}>
      <h3>{group.title}</h3>
      {group.description ? <p>{group.description}</p> : null}
      <TagList items={group.skills.map((skill) => skill.name)} label={`${group.title} skills`} />
    </article>
  );
}
