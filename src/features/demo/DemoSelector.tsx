import { demoStates } from './demoStates';
import styles from './DemoSelector.module.css';

type Props = { activeId: string };

export function DemoSelector({ activeId }: Props) {
  return (
    <nav className={styles.selector} aria-label="Demo states">
      <span className={styles.heading}>Demo state</span>
      <ul className={styles.list}>
        {demoStates.map(({ id, title }) => (
          <li key={id}>
            <a
              className={styles.link}
              href={`?state=${id}`}
              title={title}
              aria-label={`${id} ${title}`}
              aria-current={id === activeId ? 'page' : undefined}
            >
              {id}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
