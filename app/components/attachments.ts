// Files a user can attach to the AI form assistant (an existing form, a scan, a checklist).
// PDFs and images are read by Claude directly; plain text and CSV are passed as text.

export interface Attachment {
    name: string;
    mediaType: AttachmentType;
    data: string; // base64 for PDFs and images, raw text for text files
    size: number;
}

export const ATTACHMENT_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
] as const;

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv';
export const DEFAULT_ATTACHMENT_REQUEST = 'Recreate the attached form as closely as possible.';

const EXTENSION_TYPES: Record<string, AttachmentType> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
};

export const isTextAttachment = (type: AttachmentType) => type.startsWith('text/');

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Read a picked/dropped file, or explain why it can't be attached.
export async function readAttachment(file: File): Promise<Attachment | { error: string }> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mediaType = (ATTACHMENT_TYPES as readonly string[]).includes(file.type)
        ? (file.type as AttachmentType)
        : EXTENSION_TYPES[ext];

    if (!mediaType) {
        const hint = ['doc', 'docx', 'xls', 'xlsx'].includes(ext) ? ' Save it as a PDF and attach that instead.' : '';
        return { error: `${file.name} isn't a supported file. Attach a PDF, an image (PNG, JPG, WebP) or a text/CSV file.${hint}` };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return { error: `${file.name} is ${formatBytes(file.size)}. Files can be up to ${formatBytes(MAX_ATTACHMENT_BYTES)}.` };
    }

    if (isTextAttachment(mediaType)) {
        return { name: file.name, mediaType, data: await file.text(), size: file.size };
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
    return { name: file.name, mediaType, data: dataUrl.slice(dataUrl.indexOf(',') + 1), size: file.size };
}

// Hand-off from the dashboard composer to /create. Kept in memory (client-side navigation keeps
// module state) because attachments can be larger than sessionStorage allows.
let pendingAttachments: Attachment[] = [];

export function setPendingAttachments(files: Attachment[]) {
    pendingAttachments = files;
}

export function takePendingAttachments(): Attachment[] {
    const files = pendingAttachments;
    pendingAttachments = [];
    return files;
}
