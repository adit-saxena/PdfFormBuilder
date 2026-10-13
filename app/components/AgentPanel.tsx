'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ArrowUp, Sparkles, Loader2, AlertCircle, Store, ListPlus, Landmark, Paperclip, MessageSquarePlus,
} from 'lucide-react';
import { Page, HeaderConfig } from './types';
import { DEFAULT_HEADER_CONFIG } from './defaults';
import {
    AiChatMessage, AI_PROMPT_STORAGE_KEY, applySpec, formToSpec,
} from './formSpec';
import { Attachment, DEFAULT_ATTACHMENT_REQUEST, MAX_ATTACHMENTS, takePendingAttachments } from './attachments';
import { AttachButton, AttachmentChips, AttachmentError, useAttachments } from './AttachmentPicker';
import styles from './AgentPanel.module.css';

interface AgentPanelProps {
    pages: Page[];
    headerConfig: HeaderConfig;
    onApply: (pages: Page[], headerConfig: HeaderConfig) => void;
    onBusyChange?: (busy: boolean) => void;
    // Opened from the dashboard prompt: pick up the prompt/files and draft a brand-new form.
    autoStart?: boolean;
}

const EXAMPLES = [
    { icon: Store, label: 'Seller onboarding for an LLP', prompt: 'Create a seller onboarding form for an LLP: entity details with LLPIN and PAN, registered and mailing address, designated partners with PAN and DIN, GST details, top buyers, bank account details, and a declaration with signature.' },
    { icon: ListPlus, label: 'Add a GSTIN field to entity details', prompt: 'Add a GSTIN field (15 boxes) to the entity details section.' },
    { icon: Landmark, label: 'Make it a financier form for an NBFC', prompt: 'Turn this into a financier onboarding form for an NBFC, with RBI registration and beneficial owners above 10%.' },
];

export function AgentPanel({ pages, headerConfig, onApply, onBusyChange, autoStart }: AgentPanelProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const attach = useAttachments();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const startedRef = useRef(false);
    // Latest form, so a reply applies on top of any manual edits made while it was generating.
    const formRef = useRef({ pages, headerConfig });
    formRef.current = { pages, headerConfig };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, loading]);

    useEffect(() => {
        onBusyChange?.(loading);
    }, [loading, onBusyChange]);

    const submit = async (text: string, files: Attachment[], fresh: boolean) => {
        const typed = text.trim();
        const request = typed || (files.length ? DEFAULT_ATTACHMENT_REQUEST : '');
        if (request.length < 3) return;

        const history = messages.filter((m) => m.role === 'user' && m.content).map((m) => m.content);
        setMessages((prev) => [...prev, {
            role: 'user',
            content: typed,
            attachments: files.map(({ name, mediaType, size }) => ({ name, mediaType, size })),
        }]);
        setInput('');
        attach.clear();
        setError(null);
        setLoading(true);

        try {
            const current = formRef.current;
            const res = await fetch('/api/generate-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request,
                    history: fresh ? [] : history,
                    currentSpec: fresh ? null : formToSpec(current.pages, current.headerConfig),
                    attachments: files.map(({ name, mediaType, data }) => ({ name, mediaType, data })),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.spec) {
                throw new Error(data.error || 'Something went wrong. Please try again.');
            }
            const latest = formRef.current;
            const next = applySpec(data.spec, DEFAULT_HEADER_CONFIG, fresh ? undefined : latest);
            onApply(next.pages, next.headerConfig);
            setMessages((prev) => [...prev, { role: 'assistant', content: data.spec.summary }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
            // Put the request and files back so the user can retry or edit them.
            setMessages((prev) => prev.slice(0, -1));
            setInput(typed);
            attach.setFiles(files);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    const send = () => {
        if (!loading) submit(input, attach.files, false);
    };

    // Arriving from the dashboard prompt: draft a new form straight away.
    useEffect(() => {
        if (!autoStart || startedRef.current) return;
        startedRef.current = true;
        let prompt: string | null = null;
        try {
            prompt = sessionStorage.getItem(AI_PROMPT_STORAGE_KEY);
            sessionStorage.removeItem(AI_PROMPT_STORAGE_KEY);
        } catch {
            // Storage unavailable: start with an empty chat.
        }
        const files = takePendingAttachments();
        if (prompt || files.length) submit(prompt ?? '', files, true);
        // Runs once on arrival; `submit` is intentionally not a dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart]);

    const lastAssistant = messages.map((m) => m.role).lastIndexOf('assistant');

    return (
        <section
            className={`${styles.panel} ${dragging ? styles.dragging : ''}`}
            aria-label="Form agent"
            onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('Files') || loading) return;
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!loading) attach.add(e.dataTransfer.files);
            }}
        >
            {dragging && (
                <div className={styles.dropOverlay} aria-hidden="true">
                    <Paperclip size={20} />
                    Drop files to attach
                </div>
            )}

            <div className={styles.log}>
                {messages.length === 0 && !loading && (
                    <div className={styles.intro}>
                        <span className={styles.introIcon}><Sparkles size={18} /></span>
                        <h2 className={styles.introTitle}>Edit this form with AI</h2>
                        <p className={styles.introText}>
                            Ask for changes in plain words, describe a new form, or attach an existing one (PDF, scan or screenshot). Changes apply to the form on the right, and Undo reverts them.
                        </p>
                        <div className={styles.examples}>
                            {EXAMPLES.map(({ icon: Icon, label, prompt }) => (
                                <button
                                    key={label}
                                    className={styles.exampleChip}
                                    onClick={() => {
                                        setInput(prompt);
                                        inputRef.current?.focus();
                                    }}
                                >
                                    <Icon size={14} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    m.role === 'user' ? (
                        <div key={i} className={styles.userMessage}>
                            {m.attachments && m.attachments.length > 0 && <AttachmentChips files={m.attachments} />}
                            {m.content && <div className={styles.userBubble}>{m.content}</div>}
                        </div>
                    ) : (
                        <div key={i} className={styles.assistantRow}>
                            <span className={styles.avatar}><Sparkles size={12} /></span>
                            <div>
                                <p className={styles.assistantText}>{m.content}</p>
                                {i === lastAssistant && !loading && (
                                    <p className={styles.appliedNote}>Applied to the form. Use Undo above to revert.</p>
                                )}
                            </div>
                        </div>
                    )
                ))}

                {loading && (
                    <div className={styles.assistantRow} aria-live="polite">
                        <span className={styles.avatar}><Loader2 size={12} className={styles.spin} /></span>
                        <p className={`${styles.assistantText} ${styles.muted}`}>Working on your form…</p>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {error && (
                <div className={styles.error} role="alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                </div>
            )}

            <div className={styles.composer}>
                <AttachmentChips files={attach.files} onRemove={loading ? undefined : attach.remove} />
                <label className={styles.srOnly} htmlFor="agent-input">Ask the agent</label>
                <textarea
                    id="agent-input"
                    ref={inputRef}
                    className={styles.input}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    onPaste={(e) => {
                        if (e.clipboardData.files.length) {
                            e.preventDefault();
                            attach.add(e.clipboardData.files);
                        }
                    }}
                    maxLength={2000}
                    rows={3}
                    disabled={loading}
                    placeholder="Ask for a change, e.g. “Add a GSTIN field”"
                />
                <AttachmentError message={attach.error} />
                <div className={styles.bar}>
                    <div className={styles.tools}>
                        <AttachButton onPick={attach.add} disabled={loading} full={attach.files.length >= MAX_ATTACHMENTS} />
                        {messages.length > 0 && (
                            <button
                                type="button"
                                className={styles.toolButton}
                                onClick={() => {
                                    setMessages([]);
                                    setError(null);
                                }}
                                disabled={loading}
                                title="Clear the conversation (the form stays as it is)"
                                aria-label="New chat"
                            >
                                <MessageSquarePlus size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        className={styles.send}
                        onClick={send}
                        disabled={loading || (input.trim().length < 3 && attach.files.length === 0)}
                        aria-label="Send"
                    >
                        {loading ? <Loader2 size={15} className={styles.spin} /> : <ArrowUp size={15} />}
                    </button>
                </div>
            </div>
        </section>
    );
}
