import { useId, useRef, useState } from 'react';
import { Tag as TagIcon, Plus } from 'lucide-react';
import { TagPill } from './TagPill';
import { APPLICANT_TYPES, CONSTITUTIONS, normalizeTag, normalizeTags, tagTone } from './tags';
import styles from './TagEditor.module.css';

interface TagEditorProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

const SUGGESTION_GROUPS = [
    { label: 'Applicant type', tags: APPLICANT_TYPES },
    { label: 'Constitution', tags: CONSTITUTIONS },
];

const MAX_TAGS = 10;

export function TagEditor({ tags: rawTags, onChange }: TagEditorProps) {
    const tags = normalizeTags(rawTags);
    const [input, setInput] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();

    const add = (value: string) => {
        const tag = normalizeTag(value).slice(0, 40);
        if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
        onChange([...tags, tag]);
        setInput('');
    };

    const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

    const query = input.trim().toLowerCase();
    const groups = SUGGESTION_GROUPS
        .map((g) => ({ ...g, tags: g.tags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(query)) }))
        .filter((g) => g.tags.length > 0);

    return (
        <div className={styles.card}>
            <div className={styles.head}>
                <span className={styles.label}>
                    <TagIcon size={14} />
                    Tags
                </span>
                <span className={styles.hint}>Used to filter forms on the dashboard</span>
            </div>

            {tags.length > 0 && (
                <div className={styles.pills}>
                    {tags.map((t) => <TagPill key={t} tag={t} onRemove={() => remove(t)} />)}
                </div>
            )}

            <div className={styles.inputWrap}>
                <input
                    ref={inputRef}
                    className={styles.input}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            add(input);
                        } else if (e.key === 'Backspace' && !input && tags.length) {
                            remove(tags[tags.length - 1]);
                        } else if (e.key === 'Escape') {
                            setOpen(false);
                            inputRef.current?.blur();
                        }
                    }}
                    placeholder={tags.length >= MAX_TAGS ? 'Tag limit reached' : 'Add a tag, e.g. Buyer or KYC'}
                    disabled={tags.length >= MAX_TAGS}
                    maxLength={40}
                    role="combobox"
                    aria-expanded={open && (groups.length > 0 || !!query)}
                    aria-controls={listId}
                    aria-label="Add a tag"
                />

                {open && (groups.length > 0 || query) && (
                    <div id={listId} className={styles.menu} role="listbox">
                        {query && !groups.some((g) => g.tags.some((t) => t.toLowerCase() === query)) && !tags.some((t) => t.toLowerCase() === query) && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                className={styles.option}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => add(input)}
                            >
                                <Plus size={14} />
                                Add “{normalizeTag(input)}”
                            </button>
                        )}
                        {groups.map((g) => (
                            <div key={g.label} className={styles.group}>
                                <span className={styles.groupLabel}>{g.label}</span>
                                {g.tags.map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        role="option"
                                        aria-selected={false}
                                        className={styles.option}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => add(t)}
                                    >
                                        <span className={styles.dot} style={{ background: tagTone(t).dot }} />
                                        {t}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
