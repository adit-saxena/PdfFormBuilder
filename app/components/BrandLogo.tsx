// FormBuilder logo: a dark tile with two "form rows" (checkbox + field line) in KredX teal.
export function BrandMark({ size = 32 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#1a1a1a" />
            <rect x="7.5" y="8.5" width="6" height="6" rx="1.5" fill="#32BFBD" />
            <path d="M9.2 11.6l1.2 1.2 2.1-2.4" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="16" y="10.25" width="9" height="2.5" rx="1.25" fill="#fff" />
            <rect x="8.25" y="18.25" width="4.5" height="4.5" rx="1.25" stroke="#32BFBD" strokeWidth="1.5" />
            <rect x="16" y="19.25" width="6" height="2.5" rx="1.25" fill="#fff" fillOpacity="0.5" />
        </svg>
    );
}

export function BrandLogo() {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}>
            <BrandMark />
            <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1a1a', lineHeight: 1 }}>
                Form<span style={{ color: '#03635f' }}>Builder</span>
            </span>
        </span>
    );
}
