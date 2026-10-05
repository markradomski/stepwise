import { DemoLink } from './DemoLink';
import { devLiveHref, inspectorToggleHref, staticPreviewHref } from './demoRoute';
import { demoStates } from './demoStates';
import styles from './DemoSelector.module.css';

type Props = {
  demoStateId: string | null;
  inspectorOn: boolean;
  onNavigate: (href: string) => void;
};

export function DemoSelector({ demoStateId, inspectorOn, onNavigate }: Props) {
  const isLive = demoStateId === null;
  return (
    <nav className={styles.selector} aria-label="Demo controls">
      <span className={styles.tag}>Dev</span>
      <DemoLink
        href={devLiveHref(inspectorOn)}
        onNavigate={onNavigate}
        className={styles.link}
        current={isLive}
        title="Interactive practice"
      >
        Live
      </DemoLink>
      {isLive && (
        <DemoLink href={inspectorToggleHref(inspectorOn)} onNavigate={onNavigate} className={styles.link}>
          Inspector {inspectorOn ? 'off' : 'on'}
        </DemoLink>
      )}
      <span className={styles.group}>Static previews</span>
      <ul className={styles.list}>
        {demoStates.map(({ id, shortTitle, title }) => (
          <li key={id}>
            <DemoLink
              href={staticPreviewHref(id)}
              onNavigate={onNavigate}
              className={styles.link}
              current={id === demoStateId}
              title={`Static preview: ${title}`}
            >
              {id} {shortTitle}
            </DemoLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
