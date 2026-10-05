import { DemoLink } from './DemoLink';
import styles from './PreviewBanner.module.css';

type Props = { returnToLiveHref: string; onNavigate: (href: string) => void };

export function PreviewBanner({ returnToLiveHref, onNavigate }: Props) {
  return (
    <aside className={styles.banner} aria-label="Static demo preview">
      <p className={styles.label}>Static demo preview</p>
      <p className={styles.text}>This screen is a visual reference state. Controls are not interactive.</p>
      <DemoLink href={returnToLiveHref} onNavigate={onNavigate} className={styles.link}>
        Return to Live
      </DemoLink>
    </aside>
  );
}
