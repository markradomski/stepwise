import { ExplainAction } from '../ExplainAction/ExplainAction';
import styles from './ExplanationSurface.module.css';

export const unavailableExplanation = 'I can’t add a useful explanation for this yet.';

export type ExplanationSurfaceProps = {
  id: string;
  status: 'loading' | 'ready' | 'unavailable';
  title?: string;
  body?: string;
  onClose?: () => void;
  preview?: boolean;
};

export function ExplanationSurface({ id, status, title, body, onClose, preview }: ExplanationSurfaceProps) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={styles.surface}>
      <header className={styles.header}>
        <h3 id={headingId} className="overline">
          Explanation
        </h3>
        <button type="button" className={styles.close} disabled={preview} onClick={onClose}>
          Close explanation
        </button>
      </header>
      <div aria-live="polite" className={styles.body}>
        {status === 'loading' && <p>Explaining…</p>}
        {status === 'unavailable' && <p>{unavailableExplanation}</p>}
        {status === 'ready' && (
          <>
            {title && <p className={styles.title}>{title}</p>}
            <p>{body}</p>
          </>
        )}
      </div>
    </section>
  );
}

export type ExplainSlotProps = {
  action: { expanded: boolean; controls?: string; onClick?: () => void };
  surface?: ExplanationSurfaceProps;
  preview?: boolean;
};

export function ExplainSlot({ action, surface, preview }: ExplainSlotProps) {
  return (
    <div className={styles.slot}>
      <ExplainAction {...action} disabled={preview} />
      {surface && <ExplanationSurface {...surface} preview={preview} />}
    </div>
  );
}
