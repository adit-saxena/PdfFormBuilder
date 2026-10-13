// Colour-coded form tags shared by the dashboard, the editor and the AI assistant.

export interface TagTone {
    bg: string;
    fg: string;
    dot: string;
}

// Each tone pairs a light tint with a dark text shade from the same hue (WCAG AA on the tint).
const TONES = {
    teal: { bg: '#e6f7f6', fg: '#03635f', dot: '#32bfbd' },
    orange: { bg: '#fff0e5', fg: '#9a3412', dot: '#f97316' },
    indigo: { bg: '#eef0ff', fg: '#3730a3', dot: '#6366f1' },
    yellow: { bg: '#fdf6dc', fg: '#7c5a03', dot: '#eab308' },
    violet: { bg: '#f4eefe', fg: '#5b21b6', dot: '#8b5cf6' },
    sky: { bg: '#e7f4fd', fg: '#075985', dot: '#0ea5e9' },
    green: { bg: '#e8f6ec', fg: '#166534', dot: '#22c55e' },
    rose: { bg: '#fdeef1', fg: '#9f1239', dot: '#f43f5e' },
    slate: { bg: '#eff1f4', fg: '#334155', dot: '#64748b' },
    fuchsia: { bg: '#fcedfb', fg: '#86198f', dot: '#d946ef' },
} satisfies Record<string, TagTone>;

// Applicant type (role on the platform) and constitution of business, as used on KredX forms.
export const APPLICANT_TYPES = ['Buyer', 'Seller', 'Financier'];
export const CONSTITUTIONS = ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited'];

const KNOWN: Record<string, TagTone> = {
    buyer: TONES.orange,
    seller: TONES.teal,
    financier: TONES.indigo,
    proprietorship: TONES.yellow,
    partnership: TONES.violet,
    llp: TONES.sky,
    'private limited': TONES.green,
    'public limited': TONES.rose,
    'ai-generated': TONES.fuchsia,
    kyc: TONES.slate,
};

// Older forms and templates said "Vendor"; on the platform a vendor is the seller.
const ALIASES: Record<string, string> = { vendor: 'Seller', supplier: 'Seller' };

const FALLBACK = [TONES.sky, TONES.yellow, TONES.violet, TONES.green, TONES.rose, TONES.indigo, TONES.slate];

export function normalizeTag(tag: string): string {
    const trimmed = tag.trim().replace(/\s+/g, ' ');
    const alias = ALIASES[trimmed.toLowerCase()];
    if (alias) return alias;
    // Use the canonical spelling for known tags ("llp" -> "LLP").
    const known = [...APPLICANT_TYPES, ...CONSTITUTIONS, 'AI-generated', 'KYC'].find((t) => t.toLowerCase() === trimmed.toLowerCase());
    return known ?? trimmed;
}

export function normalizeTags(tags: string[]): string[] {
    return Array.from(new Set(tags.map(normalizeTag).filter(Boolean)));
}

export function tagTone(tag: string): TagTone {
    const key = normalizeTag(tag).toLowerCase();
    if (KNOWN[key]) return KNOWN[key];
    // Stable colour for any other tag, so the same tag is always the same colour.
    let hash = 0;
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return FALLBACK[hash % FALLBACK.length];
}

const INFERABLE = ['Vendor', ...APPLICANT_TYPES, ...CONSTITUTIONS, 'KYC', 'Loan'];

// Forms saved before tags existed: infer from the title.
export function inferTags(title: string): string[] {
    const t = title.toLowerCase();
    return normalizeTags(INFERABLE.filter((tag) => new RegExp(`\\b${tag.toLowerCase()}\\b`).test(t)));
}
