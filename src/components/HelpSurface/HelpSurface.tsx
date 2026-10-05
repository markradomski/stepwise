import { ReopenAction } from '../ReopenAction/ReopenAction';
import { WorkedExample } from '../WorkedExample/WorkedExample';
import styles from './HelpSurface.module.css';

export type HelpSurfaceProps = {
  id: string;
  heading: 'Help' | 'Prompt' | 'Hint' | 'Example';
  message?: string;
  example?: { before: string; after: string; explanation: string };
  forward?: { label: string; onClick?: () => void };
  prior?: { label: string; onClick?: () => void };
  onClose?: () => void;
  preview?: boolean;
};

export function HelpSurface({ id, heading, message, example, forward, prior, onClose, preview }: HelpSurfaceProps) {
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} className={styles.surface}>
      <header className={styles.header}>
        <h3 id={titleId} className="overline">
          {heading}
        </h3>
        <button type="button" className={styles.close} disabled={preview} onClick={onClose}>
          Close help
        </button>
      </header>
      <div aria-live="polite" className={styles.body}>
        {message && <p>{message}</p>}
        {example && <WorkedExample {...example} embedded />}
      </div>
      {(forward || prior) && (
        <div className={styles.actions}>
          {forward && (
            <button type="button" className={styles.forward} disabled={preview} onClick={forward.onClick}>
              {forward.label}
            </button>
          )}
          {prior && <ReopenAction {...prior} disabled={preview} />}
        </div>
      )}
    </section>
  );
}
