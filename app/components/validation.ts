import { z } from 'zod';

// Field type validation
export const FieldTypeSchema = z.enum(['text', 'number', 'date', 'checkbox', 'signature']);

// FormField validation schema
export const FormFieldSchema = z.object({
    id: z.string().min(1).max(100),
    label: z.string().min(1).max(200),
    value: z.string().max(10000), // Prevent huge strings
    type: FieldTypeSchema,
    boxCount: z.number().int().min(1).max(100).optional(),
    checked: z.boolean().optional(),
    options: z.array(z.string().max(200)).max(50).optional(),
    helpText: z.string().max(500).optional(),
    width: z.string().max(50).optional(),
    height: z.string().max(50).optional(),
    showPhoto: z.boolean().optional(),
    showSignature: z.boolean().optional(),
});

// Section validation schema
export const SectionSchema = z.object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(300),
    fields: z.array(FormFieldSchema).max(100),
});

// HeaderConfig validation schema
export const HeaderConfigSchema = z.object({
    logoText: z.string().max(50),
    logoHighlight: z.string().max(10),
    subHeader: z.array(z.string().max(100)).max(10),
    companyName: z.string().max(200),
    formTitle: z.string().max(300),
    formName: z.string().max(300).optional(),
    tags: z.array(z.string().max(40)).max(10).optional(),
    disclaimer: z.string().max(1000),
    applicationDate: z.string().max(50).optional(),
    applicationNumber: z.string().max(100).optional(),
});

// Page validation schema
export const PageSchema = z.object({
    id: z.string().min(1).max(100),
    sections: z.array(SectionSchema).max(50),
});

// Complete form structure validation
export const FormStructureSchema = z.object({
    pages: z.array(PageSchema).min(1).max(100),
    headerConfig: HeaderConfigSchema,
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// UUID validation
export const UUIDSchema = z.string().uuid();

// Sanitize string input (basic XSS prevention)
export function sanitizeString(input: string): string {
    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}

// Sanitize entire form structure
export function sanitizeFormStructure(structure: any): any {
    if (typeof structure === 'string') {
        return sanitizeString(structure);
    }

    if (Array.isArray(structure)) {
        return structure.map(sanitizeFormStructure);
    }

    if (structure && typeof structure === 'object') {
        const sanitized: any = {};
        for (const key in structure) {
            sanitized[key] = sanitizeFormStructure(structure[key]);
        }
        return sanitized;
    }

    return structure;
}
