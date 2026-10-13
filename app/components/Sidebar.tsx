import React, { useState } from 'react';
import { Plus, GripVertical, Trash2, FileText, ChevronRight, Settings, Type, Square, PenTool, X, Pencil, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Sidebar.module.css';
import { Page, Section, FormField, HeaderConfig, FieldType } from './types';
import { TagEditor } from './TagEditor';

interface SidebarProps {
    pages: Page[];
    headerConfig: HeaderConfig;
    onUpdateSection: (pageId: string, sectionId: string, updates: Partial<Section>) => void;
    onUpdateField: (pageId: string, sectionId: string, fieldId: string, updates: Partial<FormField>) => void;
    onAddField: (pageId: string, sectionId: string, type: FieldType) => void;
    onRemoveField: (pageId: string, sectionId: string, fieldId: string) => void;
    onAddPage: () => void;
    onAddSection: (pageId: string) => void;
    onRemoveSection: (pageId: string, sectionId: string) => void;
    onRemovePage: (pageId: string) => void;
    onReorderFields: (pageId: string, sectionId: string, oldIndex: number, newIndex: number) => void;
    onReorderSections: (pageId: string, oldIndex: number, newIndex: number) => void;
    onUpdateHeader: (updates: Partial<HeaderConfig>) => void;
}

// Separate component for Sortable Field
const SortableFieldItem = ({ field, sectionId, pageId, onUpdateField, onRemoveField }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    // State for local new option input
    const [newOption, setNewOption] = useState('');

    const handleAddOption = () => {
        if (newOption.trim()) {
            const currentOpts = field.options || [];
            onUpdateField(pageId, sectionId, field.id, { options: [...currentOpts, newOption.trim()] });
            setNewOption('');
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={styles.fieldCard}>
            <div className={styles.dragHandle} {...attributes} {...listeners}>
                <GripVertical size={16} />
            </div>
            <div className={styles.cardContent}>
                <span className={styles.typeBadge}>{field.type}</span>
                <input
                    className={styles.inputLabel}
                    value={field.label}
                    onChange={(e) => onUpdateField(pageId, sectionId, field.id, { label: e.target.value })}
                    placeholder="Field Label"
                    onPointerDown={(e) => e.stopPropagation()}
                />

                {/* Help Text Toggle and Input */}
                <div className={styles.field} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    {field.helpText === undefined ? (
                        <button
                            type="button"
                            className={styles.helpTextButton}
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateField(pageId, sectionId, field.id, { helpText: '' });
                            }}
                        >
                            <Plus size={12} /> Add Description / Help Text
                        </button>
                    ) : (
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>Helping Text / description</label>
                            <div className={styles.helpTextRow}>
                                <textarea
                                    className={`${styles.textInput} ${styles.helpTextArea}`}
                                    value={field.helpText}
                                    onChange={(e) => onUpdateField(pageId, sectionId, field.id, { helpText: e.target.value })}
                                    placeholder="e.g. As per Aadhaar card"
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
                                <button
                                    type="button"
                                    className={styles.removeHelpTextButton}
                                    onClick={() => onUpdateField(pageId, sectionId, field.id, { helpText: undefined })}
                                    title="Remove help text"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {['text', 'number'].includes(field.type) && (
                    <div className={styles.prefillContainer}>
                        <input
                            className={styles.inputValue}
                            value={field.value}
                            onChange={(e) => onUpdateField(pageId, sectionId, field.id, { value: e.target.value })}
                            placeholder="Default value..."
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {field.type === 'checkbox' && (
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Options</label>

                        {/* List of current options as tags */}
                        <div className={styles.optionList}>
                            {(field.options || []).map((opt: string, idx: number) => (
                                <div key={idx} className={styles.optionTag}>
                                    <span className={styles.optionTagText}>{opt}</span>
                                    <button
                                        onClick={() => {
                                            const newOpts = [...(field.options || [])];
                                            newOpts.splice(idx, 1);
                                            onUpdateField(pageId, sectionId, field.id, { options: newOpts });
                                        }}
                                        className={styles.optionTagRemove}
                                        title="Remove Option"
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add new option input */}
                        <div className={styles.inlineRow}>
                            <input
                                className={styles.textInput}
                                style={{ flex: 1 }}
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddOption();
                                    }
                                }}
                                placeholder="Type option and press Enter"
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                            <button
                                className={styles.addOptionButton}
                                onClick={handleAddOption}
                                title="Add Option"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {['text', 'number', 'date'].includes(field.type) && (
                    <div className={styles.inlineRow}>
                        <label className={styles.subLabel}>Boxes</label>
                        <input
                            type="number"
                            className={`${styles.textInput} ${styles.smallInput}`}
                            value={field.boxCount || ''}
                            onChange={(e) => onUpdateField(pageId, sectionId, field.id, { boxCount: parseInt(e.target.value) || undefined })}
                            placeholder="Auto"
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {field.type === 'signature' && (
                    <div className={styles.checkList}>
                        <label className={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={field.showPhoto}
                                onChange={(e) => onUpdateField(pageId, sectionId, field.id, { showPhoto: e.target.checked })}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                            <span>Include Photo Box</span>
                        </label>
                        <label className={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={field.showSignature}
                                onChange={(e) => onUpdateField(pageId, sectionId, field.id, { showSignature: e.target.checked })}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                            <span>Include Signature Box</span>
                        </label>
                    </div>
                )}
            </div>
            <div className={styles.cardActions}>
                <button className={`${styles.actionButton} ${styles.delete}`} title="Delete" onClick={() => onRemoveField(pageId, sectionId, field.id)}>
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    );
};

// Sortable Section with Accordion
const SortableSectionItem = ({ section, pageId, onUpdateSection, onUpdateField, onAddField, onRemoveField, onRemoveSection }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: section.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const [isExpanded, setIsExpanded] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);

    const handleAddField = (type: FieldType) => {
        onAddField(pageId, section.id, type);
        setShowAddMenu(false);
        setIsExpanded(true); // Auto expand to show new field
    };

    return (
        <div ref={setNodeRef} style={style} className={styles.section}>
            <div className={`${styles.sectionHeader} ${isExpanded ? styles.sectionHeaderOpen : ''}`}>
                <div className={styles.dragHandle} {...attributes} {...listeners} title="Drag to reorder">
                    <GripVertical size={16} />
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={styles.chevronButton}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                >
                    <ChevronRight size={16} className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`} />
                </button>
                <input
                    value={section.title}
                    onChange={(e) => onUpdateSection(pageId, section.id, { title: e.target.value })}
                    className={styles.sectionTitleInput}
                    onPointerDown={(e) => e.stopPropagation()}
                />
                <button onClick={() => onRemoveSection(pageId, section.id)} className={styles.deleteButton} title="Delete section" aria-label="Delete section">
                    <Trash2 size={15} />
                </button>
            </div>

            {isExpanded && (
                <div className={styles.sectionBody}>
                    <SortableContext items={section.fields.map((f: any) => f.id)} strategy={verticalListSortingStrategy}>
                        {section.fields.map((field: any) => (
                            <SortableFieldItem
                                key={field.id}
                                field={field}
                                sectionId={section.id}
                                pageId={pageId}
                                onUpdateField={onUpdateField}
                                onRemoveField={onRemoveField}
                            />
                        ))}
                    </SortableContext>

                    <div className={styles.addFieldWrap}>
                        <button
                            className={styles.addButton}
                            onClick={() => setShowAddMenu(!showAddMenu)}
                        >
                            <Plus size={15} /> Add Field
                        </button>

                        {showAddMenu && (
                            <div className={styles.fieldTypeMenu}>
                                <button className={styles.fieldTypeMenuItem} onClick={() => handleAddField('text')}>
                                    <Type size={14} /> Text Input
                                </button>
                                <button className={styles.fieldTypeMenuItem} onClick={() => handleAddField('checkbox')}>
                                    <Square size={14} /> Checkbox
                                </button>
                                <button className={styles.fieldTypeMenuItem} onClick={() => handleAddField('signature')}>
                                    <PenTool size={14} /> Signature / Photo
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Back to the dashboard + the editable form name. Shared by the Manual and Agent tabs.
export function FormNameCard({ headerConfig, onUpdateHeader }: { headerConfig: HeaderConfig; onUpdateHeader: (updates: Partial<HeaderConfig>) => void }) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    return (
        <div className={styles.nameRow}>
            <Link href="/dashboard" className={styles.backButton} aria-label="Back to dashboard" title="Back to dashboard">
                <ArrowLeft size={18} />
            </Link>
            <div
                className={styles.formTitleCard}
                onDoubleClick={() => setIsEditingTitle(true)}
                title="Double-click to rename this form"
            >
                <div className={styles.formTitleText}>
                    <span className={styles.eyebrow}>Form name</span>
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={headerConfig.formName || 'Untitled Form'}
                            onChange={(e) => onUpdateHeader({ formName: e.target.value })}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setIsEditingTitle(false);
                                }
                            }}
                            autoFocus
                            className={styles.formTitleInput}
                            placeholder="Enter form name..."
                        />
                    ) : (
                        <span className={styles.formTitle}>{headerConfig.formName || 'Untitled Form'}</span>
                    )}
                </div>
                {!isEditingTitle && (
                    <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => setIsEditingTitle(true)}
                        aria-label="Rename form"
                        title="Rename form"
                    >
                        <Pencil size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

export const Sidebar: React.FC<SidebarProps> = ({
    pages,
    headerConfig,
    onUpdateSection,
    onUpdateField,
    onAddField,
    onRemoveField,
    onAddPage,
    onAddSection,
    onRemoveSection,
    onRemovePage,
    onReorderFields,
    onReorderSections,
    onUpdateHeader
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [headerExpanded, setHeaderExpanded] = useState(false);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        if (active.id !== over.id) {
            // Check for Section Reordering first
            for (const page of pages) {
                const sectionIds = page.sections.map(s => s.id);
                if (sectionIds.includes(active.id.toString()) && sectionIds.includes(over.id.toString())) {
                    const oldIndex = sectionIds.indexOf(active.id.toString());
                    const newIndex = sectionIds.indexOf(over.id.toString());
                    onReorderSections(page.id, oldIndex, newIndex);
                    return;
                }
            }

            // Check for Field Reordering
            for (const page of pages) {
                for (const section of page.sections) {
                    const fieldIds = section.fields.map(f => f.id);
                    if (fieldIds.includes(active.id.toString()) && fieldIds.includes(over.id.toString())) {
                        const oldIndex = fieldIds.indexOf(active.id.toString());
                        const newIndex = fieldIds.indexOf(over.id.toString());
                        onReorderFields(page.id, section.id, oldIndex, newIndex);
                        return;
                    }
                }
            }
        }
    };

    return (
        <div className={styles.root}>
            <TagEditor tags={headerConfig.tags ?? []} onChange={(tags) => onUpdateHeader({ tags })} />

            {/* Global Form Settings (Header Config) */}
            <div className={styles.settingsCard}>
                <button
                    onClick={() => setHeaderExpanded(!headerExpanded)}
                    className={styles.settingsButton}
                    aria-expanded={headerExpanded}
                >
                    <ChevronRight size={16} className={`${styles.chevron} ${headerExpanded ? styles.chevronOpen : ''}`} />
                    <Settings size={16} className={styles.settingsIcon} /> Form Settings
                </button>

                {headerExpanded && (
                    <div className={styles.settingsPanel}>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>
                                Form Title (displayed on PDF)
                            </span>
                            <input
                                className={styles.textInput}
                                value={headerConfig.formTitle}
                                onChange={(e) => onUpdateHeader({ formTitle: e.target.value })}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Company Name</span>
                            <input
                                className={styles.textInput}
                                value={headerConfig.companyName}
                                onChange={(e) => onUpdateHeader({ companyName: e.target.value })}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Disclaimer</span>
                            <textarea
                                className={styles.textInput}
                                value={headerConfig.disclaimer}
                                onChange={(e) => onUpdateHeader({ disclaimer: e.target.value })}
                                rows={2}
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Application Date</span>
                            <input
                                className={styles.textInput}
                                value={headerConfig.applicationDate || ''}
                                onChange={(e) => onUpdateHeader({ applicationDate: e.target.value })}
                                placeholder="DD/MM/YYYY"
                            />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Application Number</span>
                            <input
                                className={styles.textInput}
                                value={headerConfig.applicationNumber || ''}
                                onChange={(e) => onUpdateHeader({ applicationNumber: e.target.value })}
                                placeholder="Enter number"
                            />
                        </label>
                    </div>
                )}
            </div>

            <div className={styles.pages}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {pages.map((page, pageIndex) => (
                    <div key={page.id} className={styles.page}>
                        <div className={styles.pageHeader}>
                            <span className={styles.pageHeaderLabel}><FileText size={14} /> Page {pageIndex + 1}</span>
                            {pages.length > 1 && (
                                <button onClick={() => onRemovePage(page.id)} title="Delete Page" aria-label="Delete page" className={styles.deleteButton}>
                                    <Trash2 size={15} />
                                </button>
                            )}
                        </div>

                        {/* Sections */}
                        <SortableContext items={page.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            {page.sections.map(section => (
                                <SortableSectionItem
                                    key={section.id}
                                    section={section}
                                    pageId={page.id}
                                    onUpdateSection={onUpdateSection}
                                    onUpdateField={onUpdateField}
                                    onAddField={onAddField}
                                    onRemoveField={onRemoveField}
                                    onRemoveSection={onRemoveSection}
                                />
                            ))}
                        </SortableContext>

                        <button
                            onClick={() => onAddSection(page.id)}
                            className={styles.addButton}
                        >
                            <Plus size={15} /> Add Section
                        </button>
                    </div>
                ))}
            </DndContext>
            </div>

            <button onClick={onAddPage} className={styles.addPageButton}>
                <Plus size={16} /> Add New Page
            </button>
        </div>
    );
};
