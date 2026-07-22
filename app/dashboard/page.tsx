'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Plus, FileText, Clock, LogOut } from 'lucide-react';
import styles from './dashboard.module.css';

interface Form {
    id: string;
    title: string;
    created_at: string;
    structure: any;
}

// Predefined templates
const TEMPLATES = [
    {
        id: 'vendor-proprietorship',
        title: 'Vendor Application (Proprietorship)',
        description: 'Vendor onboarding application for proprietorship entities',
        icon: '🏪',
    },
    {
        id: 'vendor-partnership',
        title: 'Vendor Application (Partnership)',
        description: 'Vendor onboarding application for partnership firms',
        icon: '🏪',
    },
    {
        id: 'vendor-llp',
        title: 'Vendor Application (LLP)',
        description: 'Vendor onboarding application for LLP entities',
        icon: '🏪',
    },
    {
        id: 'vendor-private-limited',
        title: 'Vendor Application (Private Limited)',
        description: 'Vendor onboarding application for private limited companies',
        icon: '🏪',
    },
    {
        id: 'vendor-public-limited',
        title: 'Vendor Application (Public Limited)',
        description: 'Vendor onboarding application for public limited companies',
        icon: '🏪',
    },
    {
        id: 'financier-proprietorship',
        title: 'Financier Application (Proprietorship)',
        description: 'Financier onboarding application for proprietorship entities',
        icon: '🏦',
    },
    {
        id: 'financier-partnership',
        title: 'Financier Application (Partnership)',
        description: 'Financier onboarding application for partnership firms',
        icon: '🏦',
    },
    {
        id: 'financier-llp',
        title: 'Financier Application (LLP)',
        description: 'Financier onboarding application for LLP entities',
        icon: '🏦',
    },
    {
        id: 'financier-private-limited',
        title: 'Financier Application (Private Limited)',
        description: 'Financier onboarding application for private limited companies',
        icon: '🏦',
    },
    {
        id: 'financier-public-limited',
        title: 'Financier Application (Public Limited)',
        description: 'Financier onboarding application for public limited companies',
        icon: '🏦',
    },
    // {
    //     id: 'employee-onboarding',
    //     title: 'Employee Onboarding',
    //     description: 'New hire information and documentation',
    //     icon: '👤',
    // },
    // {
    //     id: 'survey-form',
    //     title: 'Survey Form',
    //     description: 'Customizable survey with multiple question types',
    //     icon: '📊',
    // },
];

// Force dynamic rendering (required for protected routes)
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [recentForms, setRecentForms] = useState<Form[]>([]);
    const [loadingForms, setLoadingForms] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadRecentForms();
        }
    }, [user]);

    const loadRecentForms = async () => {
        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(6);

        if (data) {
            setRecentForms(data);
        }
        setLoadingForms(false);
    };

    const handleNewForm = () => {
        router.push('/editor');
    };

    const handleUseTemplate = (templateId: string) => {
        router.push(`/editor?template=${templateId}`);
    };

    const handleOpenForm = (formId: string) => {
        router.push(`/editor?id=${formId}`);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    if (loading || !user) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.logo}>
                        Form<span>Builder</span>
                    </h1>
                    <div className={styles.headerRight}>
                        <span className={styles.userEmail}>{user.email}</span>
                        <button onClick={handleSignOut} className={styles.signOutButton}>
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                {/* Create New Button */}
                <section className={styles.section}>
                    <button onClick={handleNewForm} className={styles.createButton}>
                        <Plus size={24} />
                        <div>
                            <h3>Create New Form</h3>
                            <p>Start from scratch</p>
                        </div>
                    </button>
                </section>

                {/* Templates */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <FileText size={20} />
                        Templates
                    </h2>
                    <div className={styles.grid}>
                        {TEMPLATES.map((template) => (
                            <div
                                key={template.id}
                                className={styles.templateCard}
                                onClick={() => handleUseTemplate(template.id)}
                            >
                                <div className={styles.templateIcon}>{template.icon}</div>
                                <h3 className={styles.templateTitle}>{template.title}</h3>
                                <p className={styles.templateDescription}>{template.description}</p>
                                <button className={styles.useTemplateButton}>Use Template</button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recent Forms */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Clock size={20} />
                        Recent Forms
                    </h2>

                    {loadingForms ? (
                        <div className={styles.loadingForms}>Loading...</div>
                    ) : recentForms.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FileText size={48} />
                            <p>No forms yet</p>
                            <button onClick={handleNewForm} className={styles.emptyButton}>
                                Create your first form
                            </button>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {recentForms.map((form) => (
                                <div
                                    key={form.id}
                                    className={styles.formCard}
                                    onClick={() => handleOpenForm(form.id)}
                                >
                                    <div className={styles.formIcon}>
                                        <FileText size={24} />
                                    </div>
                                    <h3 className={styles.formTitle}>{form.title}</h3>
                                    <p className={styles.formDate}>
                                        {new Date(form.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
