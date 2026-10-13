import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Page, HeaderConfig } from './types';
import { Share2, Check, Copy, Loader2 } from 'lucide-react';
import { FormStructureSchema, sanitizeFormStructure } from './validation';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { User } from '@supabase/supabase-js';

interface PublishButtonProps {
    pages: Page[];
    headerConfig: HeaderConfig;
    backgroundColor: string;
}

export const PublishButton: React.FC<PublishButtonProps> = ({ pages, headerConfig, backgroundColor }) => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const { user: authUser } = useAuth();

    // `signedInUser` lets the auth modal resume publishing before context state has re-rendered.
    const handlePublish = async (signedInUser?: User) => {
        const user = signedInUser ?? authUser;
        if (!user) {
            setShowAuth(true);
            return;
        }

        setIsPublishing(true);
        try {
            // Sanitize and validate form structure
            const sanitizedStructure = sanitizeFormStructure({
                pages,
                headerConfig,
                backgroundColor
            });

            // Validate against schema
            const validation = FormStructureSchema.safeParse(sanitizedStructure);

            if (!validation.success) {
                console.error('Validation errors:', validation.error.issues);
                const errorDetails = validation.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message} `).join('\n');
                alert(`Form validation failed: \n\n${errorDetails} \n\nPlease fix these issues and try again.`);
                setIsPublishing(false);
                return;
            }

            // Prepare insert data - filled_data is optional for backward compatibility
            const insertData: any = {
                title: sanitizeFormStructure(headerConfig.formTitle || 'Untitled Form'),
                structure: validation.data,
                user_id: user.id
            };

            // Only add filled_data if column exists (check will be handled by Supabase)
            try {
                insertData.filled_data = {};
            } catch (e) {
                // Column might not exist yet - that's okay
                console.log('filled_data column not available yet');
            }

            const { data, error } = await supabase
                .from('forms')
                .insert([insertData])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            if (data) {
                const url = `${window.location.origin}/share/${data.id}`;
                setShareUrl(url);
            }
        } catch (error: any) {
            console.error('Error publishing form:', error);

            // More helpful error messages
            let errorMessage = 'Failed to publish form. ';

            if (error?.message?.includes('column') && error?.message?.includes('filled_data')) {
                errorMessage += 'Database needs to be updated. Please run the SQL setup script (supabase_security_setup.sql) in your Supabase dashboard.';
            } else if (error?.code === '42501') {
                errorMessage += 'Permission denied. Please enable Row Level Security policies in your Supabase dashboard.';
            } else if (error?.message) {
                errorMessage += `Error: ${error.message}`;
            } else {
                errorMessage += 'Please check your connection and try again.';
            }

            alert(errorMessage);
        } finally {
            setIsPublishing(false);
        }
    };

    const copyToClipboard = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // If already published, show the share link
    if (shareUrl) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#166534',
                fontWeight: 500
            }}>
                <Check size={16} style={{ color: '#16a34a' }} />
                <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#166534',
                        textDecoration: 'underline',
                        marginRight: '0.25rem'
                    }}
                >
                    View Form
                </a>
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        alert('Link copied!');
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#166534',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title="Copy link"
                >
                    <Copy size={14} />
                </button>
                <button
                    onClick={() => setShareUrl(null)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#166534',
                        fontSize: '1.25rem',
                        lineHeight: 1,
                        padding: '0 0.25rem'
                    }}
                    title="Close"
                >
                    ×
                </button>
            </div>
        );
    }

    return (
        <>
        <button
            onClick={() => handlePublish()}
            disabled={isPublishing}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isPublishing ? 'wait' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
                if (!isPublishing) {
                    e.currentTarget.style.backgroundColor = '#333';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1a1a1a';
            }}
        >
            {isPublishing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
            {isPublishing ? 'Publishing...' : 'Publish & Share'}
        </button>
        {showAuth && <AuthModal
            intent="publish"
            onClose={() => setShowAuth(false)}
            onAuthenticated={(signedInUser) => {
                setShowAuth(false);
                handlePublish(signedInUser);
            }}
        />}
        </>
    );
};
