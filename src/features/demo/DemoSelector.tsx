import { demoStates } from './demoStates';
import styles from './DemoSelector.module.css';

type Props = { activeId: string | null; inspectorOn: boolean };

export function DemoSelector({ activeId, inspectorOn }: Props) {
  const live = activeId === null;
  return (
    <nav className={styles.selector} aria-label="Demo controls">
      <span className={styles.heading}>View</span>
      <ul className={styles.list}>
        <li>
          <a className={styles.link} href={inspectorOn ? '?inspector=1' : '?'} aria-current={live ? 'page' : undefined}>
            Live
          </a>
        </li>
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
        {live && (
          <li>
            <a className={styles.link} href={inspectorOn ? '?' : '?inspector=1'}>
              Inspector {inspectorOn ? 'off' : 'on'}
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
