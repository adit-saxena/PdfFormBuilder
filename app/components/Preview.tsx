import React, { useState, useEffect } from 'react';
import styles from './Preview.module.css';
import { Page, Section, AllocatedPage, HeaderConfig, FormField } from './types';
import { Check, Image as ImageIcon, PenTool } from 'lucide-react';

interface PreviewProps {
    pages: Page[];
    headerConfig: HeaderConfig;
    onUpdateField: (pageId: string, sectionId: string, fieldId: string, updates: Partial<FormField>) => void;
    onUpdateHeader: (updates: Partial<HeaderConfig>) => void;
    ref?: React.Ref<HTMLDivElement>;
    backgroundColor?: string;
    readOnlyFieldIds?: Set<string>;
}

// Heuristics for A4 Layout
const PAGE_HEIGHT = 1123;
const PAGE_PADDING = 112;
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING;

// Estimation constants
const HEADER_HEIGHT = 200;
const SECTION_TITLE_HEIGHT = 80;
const FIELD_HEIGHT = 60;

// Helper component for Boxed Input logic
const BoxedField = ({ field, onUpdate, disabled }: { field: FormField, onUpdate: (updates: Partial<FormField>) => void, disabled?: boolean }) => {
    // We need to manage focus manually because React re-renders might lose it
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !e.currentTarget.value) {
            e.preventDefault();
            // Move to previous
            const prev = document.getElementById(`${field.id}_box_${index - 1}`);
            prev?.focus();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = document.getElementById(`${field.id}_box_${index + 1}`);
            next?.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = document.getElementById(`${field.id}_box_${index - 1}`);
            prev?.focus();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const char = e.target.value.slice(-1); // Take last char if multiple typed

        // Reconstruct value
        const currentVal = field.value || '';
        const chars = currentVal.split('');
        // Ensure array is long enough 
        while (chars.length < index) chars.push(' ');
        chars[index] = char.toUpperCase();

        const newValue = chars.join('');

        const isAutoExpanding = index === (field.boxCount || 0) - 1 && char !== '';

        if (isAutoExpanding) {
            onUpdate({ value: newValue, boxCount: (field.boxCount || 0) + 1 });
            // Focus new box after render
            setTimeout(() => {
                const next = document.getElementById(`${field.id}_box_${index + 1}`);
                next?.focus();
            }, 50);
        } else {
            onUpdate({ value: newValue });
            if (char) {
                const next = document.getElementById(`${field.id}_box_${index + 1}`);
                next?.focus();
            }
        }
    };

    // Calculate number of boxes to render: explicit boxCount or at least 1
    const count = field.boxCount || 10;

    return (
        <div className={styles.boxContainer}>
            {Array.from({ length: count }).map((_, bi) => (
                <input
                    key={bi}
                    id={`${field.id}_box_${bi}`}
                    className={styles.charBoxInput}
                    value={field.value?.[bi] || ''}
                    onChange={(e) => handleChange(e, bi)}
                    onKeyDown={(e) => handleKeyDown(e, bi)}
                    autoComplete="off"
                    disabled={disabled}
                    style={disabled ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                />
            ))}
        </div>
    );
};

export const Preview = React.forwardRef<HTMLDivElement, PreviewProps>(({ pages, headerConfig, onUpdateField, onUpdateHeader, backgroundColor, readOnlyFieldIds }, ref) => {
    interface PartialSection {
        id: string;
        title: string;
        fields: FormField[];
        isContinued: boolean;
        showTitle: boolean;
    }

    interface LocalAllocatedPage {
        pageNumber: number;
        items: (PartialSection | 'header')[];
    }

    const [allocatedPages, setAllocatedPages] = useState<LocalAllocatedPage[]>([]);

    useEffect(() => {
        const getFieldHeight = (field: FormField) => {
            let h = 40; // Reduced base height
            if (field.type === 'signature') {
                h = 0;
                if (field.showPhoto) h = Math.max(h, 200); // 50mm + buffer
                if (field.showSignature) h = Math.max(h, 110); // 2.5cm + buffer
                if (h === 0) h = 40;
            }
            if (field.helpText) h += 18;
            if (field.type === 'checkbox' && field.options && field.options.length > 0) {
                const rows = Math.ceil(field.options.length / 3);
                h = Math.max(h, rows * 22 + 8);
            }
            return h + 12; // Tighter margin
        };

        const newPages: LocalAllocatedPage[] = [];
        let pageIndex = 0;
        let currentHeight = 0;
        let currentPageItems: (PartialSection | 'header')[] = [];

        const startNewPage = () => {
            if (currentPageItems.length > 0) {
                newPages.push({ pageNumber: pageIndex++, items: currentPageItems });
            }
            currentPageItems = [];
            currentHeight = 0;
        };

        // Start with header
        currentPageItems.push('header');
        currentHeight = HEADER_HEIGHT;

        const allSections = pages.flatMap(p => p.sections);

        allSections.forEach((section) => {
            let fieldsToAllocate = [...section.fields];
            let isFirstPartOfSection = true;

            while (fieldsToAllocate.length > 0) {
                const titleHeight = isFirstPartOfSection ? SECTION_TITLE_HEIGHT : 0;

                // ORPHAN PREVENTION: Relaxed to Title + 1 Field
                // Ensure we don't break if we are already at the top of a page
                if (isFirstPartOfSection && currentHeight > 0 && currentHeight !== HEADER_HEIGHT) {
                    const firstFieldHeight = fieldsToAllocate[0] ? getFieldHeight(fieldsToAllocate[0]) : 0;
                    const minimumRequired = titleHeight + firstFieldHeight;

                    if (currentHeight + minimumRequired > CONTENT_HEIGHT) {
                        startNewPage();
                    }
                }

                // Normal allocation
                let allocatedFields: FormField[] = [];
                let tempHeight = currentHeight + titleHeight;

                let i = 0;
                while (i < fieldsToAllocate.length) {
                    const fHeight = getFieldHeight(fieldsToAllocate[i]);

                    if (tempHeight + fHeight > CONTENT_HEIGHT) {
                        // Safe break if zero fields added and we are at top
                        if (allocatedFields.length === 0 && (currentHeight === 0 || currentHeight === HEADER_HEIGHT)) {
                            allocatedFields.push(fieldsToAllocate[i]);
                            tempHeight += fHeight;
                            i++;
                        }
                        break;
                    }

                    allocatedFields.push(fieldsToAllocate[i]);
                    tempHeight += fHeight;
                    i++;
                }

                if (allocatedFields.length > 0) {
                    currentPageItems.push({
                        id: section.id,
                        title: section.title,
                        fields: allocatedFields,
                        isContinued: !isFirstPartOfSection,
                        showTitle: isFirstPartOfSection
                    });
                    currentHeight = tempHeight;
                    fieldsToAllocate = fieldsToAllocate.slice(allocatedFields.length);
                    isFirstPartOfSection = false;
                } else if (fieldsToAllocate.length > 0) {
                    startNewPage();
                }
            }
        });

        if (currentPageItems.length > 0) {
            newPages.push({ pageNumber: pageIndex, items: currentPageItems });
        }

        setAllocatedPages(newPages);
    }, [pages]);

    const cssVariables = {
        '--page-bg': backgroundColor || '#ffffff'
    } as React.CSSProperties;

    const findFieldParent = (fieldId: string) => {
        for (const p of pages) {
            for (const s of p.sections) {
                if (s.fields.some(f => f.id === fieldId)) {
                    return { pageId: p.id, sectionId: s.id };
                }
            }
        }
        return null;
    };

    const handleFieldUpdate = (fieldId: string, updates: Partial<FormField>) => {
        const parent = findFieldParent(fieldId);
        if (parent) {
            onUpdateField(parent.pageId, parent.sectionId, fieldId, updates);
        }
    };

    return (
        <div ref={ref} className={styles.documentContainer} style={cssVariables}>
            {allocatedPages.map((page, i) => (
                <div key={i} className={styles.page}>

                    {page.items.map((item, idx) => {
                        if (item === 'header') {
                            const header = headerConfig;
                            return (
                                <div key="header" className={styles.headerContainer}>
                                    <div className={styles.header}>
                                        <div className={styles.logoSection}>
                                            <div className={styles.dtxLogo}>
                                                {header.logoText.replace(header.logoHighlight, '')}
                                                <span className={styles.dtxHighlight}>{header.logoHighlight}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold', lineHeight: '1.1', fontSize: '0.85rem', color: '#555' }}>
                                                {header.subHeader && header.subHeader.map((line, li) => <span key={li}>{line}</span>)}
                                            </div>
                                        </div>
                                        <div className={styles.subHeader}>
                                            {header.companyName}
                                        </div>
                                    </div>

                                    <div className={styles.formTitleContainer}>
                                        <h1 className={styles.formTitle}>{header.formTitle}</h1>
                                        <p className={styles.disclaimer}>{header.disclaimer}</p>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '0.75rem 0', marginBottom: '2rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span className={styles.label} style={{ width: 'auto' }}>Application Date :</span>
                                                <input
                                                    className={styles.inputLineEditable}
                                                    style={{ width: '150px', minWidth: '150px' }}
                                                    value={header.applicationDate || ''}
                                                    onChange={(e) => onUpdateHeader({ applicationDate: e.target.value })}
                                                    placeholder="DD/MM/YYYY"
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span className={styles.label} style={{ width: 'auto' }}>Application Number :</span>
                                                <input
                                                    className={styles.inputLineEditable}
                                                    style={{ width: '150px', minWidth: '150px' }}
                                                    value={header.applicationNumber || ''}
                                                    onChange={(e) => onUpdateHeader({ applicationNumber: e.target.value })}
                                                    placeholder="Enter number"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else {
                            const section = item as PartialSection;
                            return (
                                <div key={`${section.id}-${page.pageNumber}`} className={styles.section}>
                                    {section.showTitle && section.title && (
                                        <>
                                            <h2 className={styles.sectionTitle}>{section.title}</h2>
                                            <div style={{ height: '2px', background: '#000', width: '100%', marginBottom: '1rem' }}></div>
                                        </>
                                    )}

                                    <div className={styles.grid}>
                                        {section.fields.map(field => {
                                            const isReadOnly = readOnlyFieldIds?.has(field.id);
                                            return (
                                                <div key={field.id} className={styles.fieldContainer}>
                                                    {field.type !== 'signature' && (
                                                        <div className={styles.labelContainer}>
                                                            <label className={styles.label}>{field.label} :</label>
                                                            {field.helpText && (
                                                                <span className={styles.helpText}>{field.helpText}</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {['text', 'number', 'date'].includes(field.type) ? (
                                                        field.boxCount ? (
                                                            <BoxedField
                                                                field={field}
                                                                onUpdate={(u) => handleFieldUpdate(field.id, u)}
                                                                disabled={readOnlyFieldIds?.has(field.id)}
                                                            />
                                                        ) : (
                                                            <input
                                                                className={styles.inputLineEditable}
                                                                value={field.value}
                                                                onChange={(e) => handleFieldUpdate(field.id, { value: e.target.value })}
                                                                disabled={readOnlyFieldIds?.has(field.id)}
                                                            />
                                                        )
                                                    ) : field.type === 'checkbox' ? (
                                                        <div className="flex flex-col gap-2 w-full">
                                                            {field.options && field.options.length > 0 ? (
                                                                <div className={styles.checkboxGrid}>
                                                                    {field.options.map((opt, optIndex) => {
                                                                        const isSelected = (field.value || '').split(',').includes(opt);
                                                                        return (
                                                                            <div key={optIndex} className={styles.checkboxItem}
                                                                                onClick={() => {
                                                                                    if (readOnlyFieldIds?.has(field.id)) return;
                                                                                    const current = (field.value || '').split(',').filter(Boolean);
                                                                                    let newVals;
                                                                                    if (current.includes(opt)) {
                                                                                        newVals = current.filter(v => v !== opt);
                                                                                    } else {
                                                                                        newVals = [...current, opt];
                                                                                    }
                                                                                    handleFieldUpdate(field.id, { value: newVals.join(',') });
                                                                                }}
                                                                            >
                                                                                <div className={styles.checkbox}>
                                                                                    {isSelected && <Check size={16} strokeWidth={3} />}
                                                                                </div>
                                                                                <span style={{ fontSize: '0.85rem', lineHeight: '1.2' }}>{opt}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className={styles.checkbox}
                                                                    onClick={() => {
                                                                        if (!readOnlyFieldIds?.has(field.id)) {
                                                                            handleFieldUpdate(field.id, { checked: !field.checked });
                                                                        }
                                                                    }}
                                                                >
                                                                    {field.checked && <Check size={16} strokeWidth={3} />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : field.type === 'signature' ? (
                                                        <div className="w-full py-4">
                                                            <div className={styles.signatureRow}>
                                                                {field.showPhoto && (
                                                                    <div className={styles.photoBox}
                                                                        style={{ width: '40mm', height: '50mm' }}>
                                                                        <div className={styles.photoInstruction}>
                                                                            <div>Please paste</div>
                                                                            <div>latest passport</div>
                                                                            <div>size photo.</div>
                                                                            <div className="mt-6">Photo to be</div>
                                                                            <div>signed accross</div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {field.showSignature && (
                                                                    <div className="flex-1">
                                                                        <div className={styles.signatureBox}
                                                                            style={{ width: '100%', maxWidth: '7cm', height: '2.5cm' }}>
                                                                            <span className={styles.signatureWatermark}>
                                                                                {field.label}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }
                    })}

                </div>
            ))}
        </div>
    );
});

Preview.displayName = "Preview";
