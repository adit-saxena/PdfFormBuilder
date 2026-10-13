'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
    FileText, Clock, Store, Landmark, ShoppingCart, Sparkles, ArrowRight, ArrowUp, LogIn, LogOut, LayoutGrid,
    CalendarDays, X, FilePlus2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { APPLICANT_TYPES, CONSTITUTIONS, inferTags, normalizeTags, tagTone } from '../components/tags';
import { AI_PROMPT_STORAGE_KEY } from '../components/formSpec';
import { TagList } from '../components/TagPill';
import { BrandLogo } from '../components/BrandLogo';
import { MAX_ATTACHMENTS, setPendingAttachments } from '../components/attachments';
import { AttachButton, AttachmentChips, AttachmentError, useAttachments } from '../components/AttachmentPicker';
import styles from './dashboard.module.css';

interface Form {
    id: string;
    title: string;
    created_at: string;
    structure: { headerConfig?: { tags?: string[] } } | null;
}

interface Template {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    tags: string[];
}

const CONSTITUTION_NOUNS: Record<string, string> = {
    Proprietorship: 'proprietorship entities',
    Partnership: 'partnership firms',
    LLP: 'LLPs',
    'Private Limited': 'private limited companies',
    'Public Limited': 'public limited companies',
};

const APPLICANT_ICONS: Record<string, LucideIcon> = { Buyer: ShoppingCart, Seller: Store, Financier: Landmark };

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

// Predefined templates (ids must match TEMPLATE_MAP in FormBuilder)
const TEMPLATES: Template[] = APPLICANT_TYPES.flatMap((applicant) =>
    CONSTITUTIONS.map((constitution) => ({
        id: `${slug(applicant)}-${slug(constitution)}`,
        title: `${applicant} Application (${constitution})`,
        description: `${applicant} onboarding application for ${CONSTITUTION_NOUNS[constitution]}`,
        icon: APPLICANT_ICONS[applicant],
        tags: [applicant, constitution],
    }))
);

// Filter facets. Names follow Indian KYC usage: the applicant's role on the platform, and the
// "constitution" of the business (as in CKYC / GST registration).
const FILTER_GROUPS = [
    { key: 'applicant', label: 'Applicant type', tags: APPLICANT_TYPES },
    { key: 'constitution', label: 'Constitution', tags: CONSTITUTIONS },
];

const EXAMPLES = [
    'Seller onboarding for an LLP',
    'Buyer KYC for a private limited company',
    'Financier onboarding for an NBFC',
];

const formTags = (form: Form) => normalizeTags(form.structure?.headerConfig?.tags ?? inferTags(form.title));

export default function DashboardPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [recentForms, setRecentForms] = useState<Form[]>([]);
    const [loadingForms, setLoadingForms] = useState(true);
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const attach = useAttachments();

    const isSignedIn = !!user && !user.is_anonymous;

    // The header blends into the page until content scrolls under it.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 4);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (loading) return;
        let cancelled = false;
        const userId = user?.id;
        (async () => {
            const { data } = userId
                ? await supabase
                    .from('forms')
                    .select('id, title, created_at, structure')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(12)
                : { data: [] as Form[] };
            if (cancelled) return;
            setRecentForms(data ?? []);
            setLoadingForms(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, loading]);

    // How many templates carry each tag (shown as a tooltip on the filter chips).
    const tagCounts = useMemo(() => {
        const counts = new Map<string, number>();
        TEMPLATES.forEach((t) => t.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
        return counts;
    }, []);

    // Faceted filtering: any selected tag within a facet matches (OR); facets combine with AND.
    const matches = (tags: string[]) =>
        FILTER_GROUPS.every((facet) => {
            const selected = facet.tags.filter((t) => activeTags.includes(t));
            return selected.length === 0 || selected.some((t) => tags.includes(t));
        });
    const visibleTemplates = TEMPLATES.filter((t) => matches(t.tags));

    const toggleTag = (tag: string) =>
        setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

    const canGenerate = prompt.trim().length >= 3 || attach.files.length > 0;

    const startWithAi = () => {
        if (!canGenerate) return;
        try {
            sessionStorage.setItem(AI_PROMPT_STORAGE_KEY, prompt.trim());
        } catch {
            // Storage unavailable: the workspace opens with an empty chat.
        }
        setPendingAttachments(attach.files);
        router.push('/editor?mode=agent');
    };

    const handleSignOut = async () => {
        await signOut();
        setActiveTags([]);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
                <div className={styles.headerContent}>
                    <a href="/dashboard" className={styles.brand} aria-label="FormBuilder home">
                        <BrandLogo />
                    </a>
                    <div className={styles.headerRight}>
                        {isSignedIn ? (
                            <>
                                <span className={styles.userEmail} title={user?.email ?? ''}>{user?.email}</span>
                                <button onClick={handleSignOut} className={styles.headerButton}>
                                    <LogOut size={16} />
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setShowLogin(true)} className={styles.headerButton}>
                                <LogIn size={16} />
                                Log in
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                {/* Prompt composer */}
                <section className={styles.hero}>
                    <h1 className={styles.heroTitle}>What would you like to create?</h1>
                    <p className={styles.heroSubtitle}>
                        Describe the form in plain words and AI drafts it for you, or start from a KredX template below.
                    </p>

                    <div
                        className={`${styles.composer} ${dragging ? styles.composerDragging : ''}`}
                        onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes('Files')) return;
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragging(false);
                            attach.add(e.dataTransfer.files);
                        }}
                    >
                        {attach.files.length > 0 && (
                            <div className={styles.composerFiles}>
                                <AttachmentChips files={attach.files} onRemove={attach.remove} />
                            </div>
                        )}
                        <label className={styles.srOnly} htmlFor="new-form-prompt">Describe the form you need</label>
                        <textarea
                            id="new-form-prompt"
                            className={styles.composerInput}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    startWithAi();
                                }
                            }}
                            onPaste={(e) => {
                                if (e.clipboardData.files.length) {
                                    e.preventDefault();
                                    attach.add(e.clipboardData.files);
                                }
                            }}
                            rows={3}
                            maxLength={2000}
                            placeholder="e.g. Seller onboarding form for an LLP: entity details, designated partners with PAN and DIN, GST and bank details, and a declaration. You can also attach an existing form."
                        />
                        {attach.error && (
                            <div className={styles.composerFiles}>
                                <AttachmentError message={attach.error} />
                            </div>
                        )}
                        <div className={styles.composerBar}>
                            <div className={styles.examples}>
                                {EXAMPLES.map((ex) => (
                                    <button key={ex} className={styles.exampleChip} onClick={() => setPrompt(ex)}>
                                        {ex}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.composerActions}>
                                <AttachButton onPick={attach.add} full={attach.files.length >= MAX_ATTACHMENTS} />
                                <button className={styles.blankButton} onClick={() => router.push('/editor')}>
                                    <FilePlus2 size={16} />
                                    Blank form
                                </button>
                                <button
                                    className={styles.generateButton}
                                    onClick={startWithAi}
                                    disabled={!canGenerate}
                                >
                                    <Sparkles size={16} />
                                    Generate
                                    <ArrowUp size={15} className={styles.generateArrow} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Recent Forms (only once there are some) */}
                {!loadingForms && recentForms.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                <Clock size={18} />
                                Recent forms
                            </h2>
                            <span className={styles.sectionCount}>{recentForms.length}</span>
                        </div>

                        <div className={styles.grid}>
                            {recentForms.map((form) => (
                                <button
                                    key={form.id}
                                    className={styles.card}
                                    onClick={() => router.push(`/editor?id=${form.id}`)}
                                >
                                    <span className={`${styles.cardIcon} ${styles.cardIconNeutral}`}>
                                        <FileText size={20} />
                                    </span>
                                    <span className={styles.cardTitle}>{form.title}</span>
                                    <span className={styles.cardMeta}>
                                        <CalendarDays size={14} />
                                        {new Date(form.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </span>
                                    <TagList tags={formTags(form)} />
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Templates */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <LayoutGrid size={18} />
                            Templates
                        </h2>
                        <span className={styles.sectionCount}>
                            {visibleTemplates.length === TEMPLATES.length ? TEMPLATES.length : `${visibleTemplates.length} of ${TEMPLATES.length}`}
                        </span>
                    </div>

                    {/* Tag filters */}
                    <div className={styles.filterBar} role="group" aria-label="Filter templates">
                        {FILTER_GROUPS.map((facet) => (
                            <div key={facet.key} className={styles.facet} role="group" aria-labelledby={`facet-${facet.key}`}>
                                <span id={`facet-${facet.key}`} className={styles.facetLabel}>{facet.label}</span>
                                {facet.tags.map((tag) => {
                                    const tone = tagTone(tag);
                                    const active = activeTags.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                                            style={active ? { background: tone.bg, color: tone.fg, borderColor: tone.dot } : undefined}
                                            aria-pressed={active}
                                            onClick={() => toggleTag(tag)}
                                            title={`${tagCounts.get(tag) ?? 0} templates`}
                                        >
                                            <span className={styles.chipDot} style={{ background: tone.dot }} />
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                        {activeTags.length > 0 && (
                            <button className={styles.clearButton} onClick={() => setActiveTags([])}>
                                <X size={13} />
                                Clear
                            </button>
                        )}
                    </div>

                    {visibleTemplates.length === 0 ? (
                        <p className={styles.noMatch}>No templates match these filters.</p>
                    ) : (
                        <div className={styles.grid}>
                            {visibleTemplates.map((template) => {
                                const Icon = template.icon;
                                const tone = tagTone(template.tags[0]);
                                return (
                                    <button
                                        key={template.id}
                                        className={styles.card}
                                        onClick={() => router.push(`/editor?template=${template.id}`)}
                                    >
                                        <span className={styles.cardIcon} style={{ background: tone.bg, color: tone.fg }}>
                                            <Icon size={20} />
                                        </span>
                                        <span className={styles.cardTitle}>{template.title}</span>
                                        <span className={styles.cardDescription}>{template.description}</span>
                                        <TagList tags={template.tags} />
                                        <span className={styles.cardAction}>
                                            Use template
                                            <ArrowRight size={15} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {showLogin && (
                <AuthModal
                    intent="signin"
                    onClose={() => setShowLogin(false)}
                    onAuthenticated={() => setShowLogin(false)}
                />
            )}
        </div>
    );
}
