'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Page, HeaderConfig, FormField, Section } from '../../components/types';
import { Preview, DEFAULT_PAGE_BG } from '../../components/Preview';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { sanitizeFormStructure } from '../../components/validation';

interface ShareViewProps {
    formId: string;
    initialPages: Page[];
    initialHeaderConfig: HeaderConfig;
    formTitle: string;
    initialBackgroundColor?: string;
    initialFilledData?: Record<string, any>;
}

import styles from './ShareView.module.css';

export function ShareView({
    formId,
    initialPages,
    initialHeaderConfig,
    formTitle,
    initialBackgroundColor,
    initialFilledData = {}
}: ShareViewProps) {
    // Merge initial pages with filled data
    const mergedPages = useMemo(() => {
        return initialPages.map(page => ({
            ...page,
            sections: page.sections.map(section => ({
                ...section,
                fields: section.fields.map(field => {
                    const filledValue = initialFilledData[field.id];
                    if (filledValue !== undefined) {
                        return { ...field, value: filledValue };
                    }
                    return field;
                })
            }))
        }));
    }, [initialPages, initialFilledData]);

    const [pages, setPages] = useState<Page[]>(mergedPages);
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(initialHeaderConfig);
    const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor || DEFAULT_PAGE_BG);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Identify fields that were pre-filled by the creator and lock them.
    const readOnlyFieldIds = useMemo(() => {
        const ids = new Set<string>();
        initialPages.forEach(page => {
            page.sections.forEach(section => {
                section.fields.forEach(field => {
                    // Lock fields with pre-filled template data (not user-filled data)
                    if (field.value && field.value.toString().trim() !== '') {
                        ids.add(field.id);
                    }
                    if (field.type === 'checkbox' && field.checked === true) {
                        ids.add(field.id);
                    }
                });
            });
        });
        return ids;
    }, [initialPages]);

    // Save filled data to database
    const saveFilledData = async () => {
        setIsSaving(true);
        try {
            // Extract only field values (not read-only template structure)
            const filledData: Record<string, string> = {};
            pages.forEach(page => {
                page.sections.forEach(section => {
                    section.fields.forEach(field => {
                        if (!readOnlyFieldIds.has(field.id)) {
                            filledData[field.id] = field.value;
                        }
                    });
                });
            });

            // Sanitize before saving
            const sanitizedData = sanitizeFormStructure(filledData);

            const { error } = await supabase
                .from('forms')
                .update({ filled_data: sanitizedData })
                .eq('id', formId);

            if (error) {
                console.error('Error saving filled data:', error);
                alert('Failed to save. Please try again.');
            } else {
                setHasUnsavedChanges(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Error saving filled data:', error);
            alert('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
            setShowSaveConfirm(false);
        }
    };

    const handleSaveClick = () => {
        if (!hasUnsavedChanges) return;
        setShowSaveConfirm(true);
    };

    const handleConfirmSave = () => {
        saveFilledData();
    };

    const handleCancelSave = () => {
        setShowSaveConfirm(false);
    };

    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: formTitle || 'Application_Form',
    });

    const updateHeader = (updates: Partial<HeaderConfig>) => {
        setHeaderConfig(prev => ({ ...prev, ...updates }));
    };

    const updateField = (pageId: string, sectionId: string, fieldId: string, updates: Partial<FormField>) => {
        setPages(prev => {
            const updated = prev.map(page => {
                if (page.id !== pageId) return page;
                return {
                    ...page,
                    sections: page.sections.map(s => {
                        if (s.id !== sectionId) return s;
                        return {
                            ...s,
                            fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
                        };
                    })
                };
            });

            // Mark as having unsaved changes
            setHasUnsavedChanges(true);

            return updated;
        });
    };

    return (
        <div className={styles.container}>
            {/* Confirmation Modal */}
            {showSaveConfirm && (
                <div className={styles.modalOverlay} onClick={handleCancelSave}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Confirm Save</h3>
                        <p className={styles.modalText}>
                            Your changes will be saved and <strong>visible to everyone</strong> who has this link.
                            This form is collaborative.
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                onClick={handleCancelSave}
                                className={styles.modalCancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                className={styles.modalSaveButton}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.headerContainer}>
                <h1 className={styles.formTitle}>{formTitle}</h1>

                <div className="flex items-center gap-4">
                    {saveSuccess && (
                        <span className={styles.successMessage}>
                            ✓ Saved successfully
                        </span>
                    )}
                    <button
                        onClick={handleSaveClick}
                        className={`${styles.saveButton} ${!hasUnsavedChanges ? styles.saveButtonDisabled : ''}`}
                        disabled={!hasUnsavedChanges || isSaving}
                    >
                        {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
                    </button>
                    <button
                        onClick={() => handlePrint && handlePrint()}
                        className={styles.printButton}
                    >
                        <Printer size={18} /> Print / Export PDF
                    </button>
                </div>
            </div>

            <Preview
                ref={componentRef}
                pages={pages}
                headerConfig={headerConfig}
                onUpdateField={updateField}
                onUpdateHeader={updateHeader}
                backgroundColor={backgroundColor}
                readOnlyFieldIds={readOnlyFieldIds}
            />
        </div>
    );
}
