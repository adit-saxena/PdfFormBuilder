import { useCallback, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Paperclip, X } from 'lucide-react';
import {
    Attachment, ATTACHMENT_ACCEPT, MAX_ATTACHMENTS, formatBytes, readAttachment,
} from './attachments';
import styles from './AttachmentPicker.module.css';

// State + validation for files attached to an AI prompt.
export function useAttachments() {
    const [files, setFilesState] = useState<Attachment[]>([]);
    const [error, setError] = useState<string | null>(null);
    // Mirror of `files` so async adds see the latest list.
    const filesRef = useRef<Attachment[]>([]);

    const setFiles = useCallback((next: Attachment[]) => {
        filesRef.current = next;
        setFilesState(next);
    }, []);

    const add = useCallback(async (list: FileList | File[] | null) => {
        if (!list || list.length === 0) return;
        const results = await Promise.all(Array.from(list).map(readAttachment));
        const next = [...filesRef.current];
        let firstError: string | null = null;
        for (const r of results) {
            if ('error' in r) {
                firstError ??= r.error;
            } else if (next.some((f) => f.name === r.name && f.size === r.size)) {
                continue;
            } else if (next.length >= MAX_ATTACHMENTS) {
                firstError ??= `You can attach up to ${MAX_ATTACHMENTS} files.`;
            } else {
                next.push(r);
            }
        }
        setFiles(next);
        setError(firstError);
    }, [setFiles]);

    const remove = useCallback((index: number) => {
        setFiles(filesRef.current.filter((_, i) => i !== index));
        setError(null);
    }, [setFiles]);

    const clear = useCallback(() => {
        setFiles([]);
        setError(null);
    }, [setFiles]);

    return { files, setFiles, add, remove, clear, error, setError };
}

export function AttachButton({ onPick, disabled, full }: { onPick: (files: FileList | null) => void; disabled?: boolean; full?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <button
                type="button"
                className={styles.attachButton}
                onClick={() => inputRef.current?.click()}
                disabled={disabled || full}
                aria-label="Attach files"
                title={full ? `Up to ${MAX_ATTACHMENTS} files` : 'Attach a PDF, image or text file'}
            >
                <Paperclip size={16} />
            </button>
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className={styles.hiddenInput}
                onChange={(e) => {
                    onPick(e.target.files);
                    e.target.value = '';
                }}
                tabIndex={-1}
                aria-hidden="true"
            />
        </>
    );
}

export function AttachmentChips({ files, onRemove }: { files: Pick<Attachment, 'name' | 'mediaType' | 'size'>[]; onRemove?: (index: number) => void }) {
    if (files.length === 0) return null;
    return (
        <ul className={styles.chips}>
            {files.map((f, i) => {
                const Icon = f.mediaType.startsWith('image/') ? ImageIcon : FileText;
                return (
                    <li key={`${f.name}-${i}`} className={styles.chip}>
                        <span className={styles.chipIcon}><Icon size={14} /></span>
                        <span className={styles.chipName} title={f.name}>{f.name}</span>
                        {f.size > 0 && <span className={styles.chipSize}>{formatBytes(f.size)}</span>}
                        {onRemove && (
                            <button type="button" className={styles.chipRemove} onClick={() => onRemove(i)} aria-label={`Remove ${f.name}`}>
                                <X size={13} />
                            </button>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

export function AttachmentError({ message }: { message: string | null }) {
    if (!message) return null;
    return <p className={styles.error} role="alert">{message}</p>;
}
