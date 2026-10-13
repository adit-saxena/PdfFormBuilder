import { X } from 'lucide-react';
import { tagTone } from './tags';
import styles from './TagPill.module.css';

export function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
    const tone = tagTone(tag);
    return (
        <span className={styles.pill} style={{ background: tone.bg, color: tone.fg }}>
            <span className={styles.dot} style={{ background: tone.dot }} />
            {tag}
            {onRemove && (
                <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove tag ${tag}`}>
                    <X size={12} />
                </button>
            )}
        </span>
    );
}

export function TagList({ tags }: { tags: string[] }) {
    if (tags.length === 0) return null;
    return (
        <div className={styles.list}>
            {tags.map((t) => <TagPill key={t} tag={t} />)}
        </div>
    );
}
