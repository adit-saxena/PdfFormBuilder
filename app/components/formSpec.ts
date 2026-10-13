import { z } from 'zod';
import { Page, HeaderConfig, FormField } from './types';
import { normalizeTags } from './tags';
import type { Attachment } from './attachments';

// Shape Claude returns when drafting a form from a plain-text description.
// Kept flat and simple (nullable instead of optional) so it maps cleanly to structured outputs.
export const AiFieldSchema = z.object({
    label: z.string().describe('Field label as printed on the form, e.g. "PAN Number"'),
    type: z.enum(['text', 'number', 'date', 'checkbox', 'signature']).describe(
        'text for free text and IDs, number for amounts/counts, date for dates, checkbox for a choice list (put choices in options), signature for a signature box'
    ),
    helpText: z.string().nullable().describe('Short hint shown under the label, or null'),
    options: z.array(z.string()).describe('Choices for checkbox fields; empty array for every other type'),
    boxCount: z.number().int().nullable().describe('Character boxes for fixed-length values (PAN = 10, IFSC = 11, PIN code = 6, mobile = 10), or null for free-length fields'),
});

export const AiFormSpecSchema = z.object({
    summary: z.string().describe('One or two sentences, addressed to the user, describing what you built or changed'),
    formName: z.string().describe('Short internal name for the form, e.g. "Seller KYC - LLP"'),
    formTitle: z.string().describe('Title printed at the top of the form'),
    disclaimer: z.string().describe('One-line instruction printed under the title'),
    tags: z.array(z.string()).describe('1 to 4 short category tags. Use these exact names when they apply: applicant type "Buyer", "Seller" or "Financier"; constitution "Proprietorship", "Partnership", "LLP", "Private Limited" or "Public Limited". Add at most one other short tag such as "KYC", "Loan" or "HR".'),
    sections: z.array(z.object({
        title: z.string(),
        fields: z.array(AiFieldSchema),
    })),
});

export type AiFormSpec = z.infer<typeof AiFormSpecSchema>;

export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
    attachments?: Pick<Attachment, 'name' | 'mediaType' | 'size'>[];
}

// Session storage key used to hand the dashboard prompt to the editor's Agent tab.
export const AI_PROMPT_STORAGE_KEY = 'formbuilder:ai-prompt';
export const AI_TAG = 'AI-generated';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';

// The editor's form as the AI sees it (used when the agent edits an existing form).
export function formToSpec(pages: Page[], header: HeaderConfig): AiFormSpec {
    return {
        summary: '',
        formName: header.formName || header.formTitle || 'Untitled Form',
        formTitle: header.formTitle,
        disclaimer: header.disclaimer,
        tags: header.tags ?? [],
        sections: pages.flatMap((page) => page.sections).map((section) => ({
            title: section.title,
            fields: section.fields.map((f) => ({
                label: f.label,
                type: f.type,
                helpText: f.helpText ?? null,
                options: f.type === 'checkbox' ? f.options ?? [] : [],
                boxCount: f.boxCount ?? null,
            })),
        })),
    };
}

export const hasFields = (pages: Page[]) => pages.some((p) => p.sections.some((s) => s.fields.length > 0));

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Apply an AI spec to the editor. With `current`, sections and fields that still exist keep their
// ids, prefilled values, sizing and page; header settings the AI doesn't manage are kept too.
// Without it, the spec becomes a brand-new form tagged as AI-generated.
export function applySpec(
    spec: AiFormSpec,
    baseHeader: HeaderConfig,
    current?: { pages: Page[]; headerConfig: HeaderConfig },
): { pages: Page[]; headerConfig: HeaderConfig } {
    const oldSections = current?.pages.flatMap((page, pageIndex) => page.sections.map((section) => ({ section, pageIndex }))) ?? [];
    const oldFields = oldSections.flatMap(({ section }) => section.fields);
    const claimedSections = new Set<string>();
    const claimedFields = new Set<string>();

    const usedIds = new Set<string>();
    const uniqueId = (base: string) => {
        let id = base;
        let n = 2;
        while (usedIds.has(id)) id = `${base}-${n++}`;
        usedIds.add(id);
        return id;
    };

    let lastPage = 0;
    const placed = spec.sections
        .filter((s) => s.fields.length > 0)
        .map((section) => {
            const match = oldSections.find(({ section: old }) => !claimedSections.has(old.id) && norm(old.title) === norm(section.title));
            if (match) claimedSections.add(match.section.id);
            // New sections land on the same page as the section before them.
            const pageIndex = match ? match.pageIndex : lastPage;
            lastPage = pageIndex;

            const fields = section.fields.map((f): FormField => {
                const prev = oldFields.find((old) => !claimedFields.has(old.id) && old.type === f.type && norm(old.label) === norm(f.label));
                if (prev) claimedFields.add(prev.id);
                const field: FormField = {
                    ...(prev ?? {}),
                    id: uniqueId(prev?.id ?? `ai-${slug(f.label)}`),
                    label: f.label.slice(0, 200) || 'Untitled field',
                    value: prev?.value ?? '',
                    type: f.type,
                };
                field.helpText = f.helpText ? f.helpText.slice(0, 500) : undefined;
                field.options = f.type === 'checkbox' ? f.options.slice(0, 50) : undefined;
                field.boxCount = f.boxCount && f.boxCount > 0 && ['text', 'number', 'date'].includes(f.type)
                    ? Math.min(f.boxCount, 100)
                    : undefined;
                if (f.type === 'signature' && !prev) {
                    field.showSignature = true;
                    field.showPhoto = false;
                }
                return field;
            });

            return {
                pageIndex,
                section: { id: uniqueId(match?.section.id ?? `ai-${slug(section.title)}`), title: section.title.slice(0, 300), fields },
            };
        });

    // Keep the existing page split; drop pages the edit emptied (always keep at least one).
    const pageCount = Math.max(1, current?.pages.length ?? 1);
    const pages: Page[] = Array.from({ length: pageCount }, (_, i) => ({
        id: current?.pages[i]?.id ?? `page${i + 1}`,
        sections: placed.filter((p) => p.pageIndex === i).map((p) => p.section),
    })).filter((page, i) => i === 0 || page.sections.length > 0);

    const header = current?.headerConfig ?? baseHeader;
    const tags = normalizeTags(current ? spec.tags.slice(0, 10) : [...spec.tags.slice(0, 4), AI_TAG]);

    return {
        pages,
        headerConfig: {
            ...header,
            formName: spec.formName || header.formName,
            formTitle: spec.formTitle || header.formTitle,
            disclaimer: spec.disclaimer || header.disclaimer,
            tags,
        },
    };
}
