'use client';

import { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { User } from '@supabase/supabase-js';
import { Page, HeaderConfig } from './types';
import { sanitizeFormStructure } from './validation';

interface SaveButtonProps {
    pages: Page[];
    headerConfig: HeaderConfig;
    backgroundColor: string;
    formId?: string;
    onSaved?: (formId: string) => void;
}

export function SaveButton({ pages, headerConfig, backgroundColor, formId, onSaved }: SaveButtonProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const { user: authUser } = useAuth();

    // `signedInUser` lets the auth modal resume saving before context state has re-rendered.
    const handleSave = async (signedInUser?: User) => {
        // Use formName if set, otherwise fall back to formTitle
        const fileName = headerConfig.formName || headerConfig.formTitle || 'Untitled Form';

        if (!fileName || fileName.trim() === '' || fileName === 'Untitled Form') {
            alert('Please enter a form name (double-click on the title in the sidebar) before saving');
            return;
        }

        const user = signedInUser ?? authUser;
        if (!user) {
            setShowAuth(true);
            return;
        }

        setIsSaving(true);
        try {
            // Sanitize data before saving
            const sanitizedStructure = sanitizeFormStructure({ pages, headerConfig });

            const formData = {
                title: fileName,
                structure: sanitizedStructure,
                user_id: user.id,
                // background_color: backgroundColor, // TODO: Add this column to database first
            };

            let data;
            if (formId) {
                // Update existing form
                const { data: updateData, error } = await supabase
                    .from('forms')
                    .update(formData)
                    .eq('id', formId)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                data = updateData;
            } else {
                // Create new form
                const { data: insertData, error } = await supabase
                    .from('forms')
                    .insert([formData])
                    .select()
                    .single();

                if (error) throw error;
                data = insertData;
            }

            if (data && onSaved) {
                onSaved(data.id);
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

        } catch (error: any) {
            console.error('Error saving form:', error);

            let errorMessage = 'Failed to save form. ';
            if (error?.code === '42501') {
                errorMessage += 'Permission denied. Please check your authentication.';
            } else if (error?.message) {
                errorMessage += `Error: ${error.message}`;
            } else {
                errorMessage += 'Please check your connection and try again.';
            }

            alert(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (saved) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#166534',
                fontWeight: 500
            }}>
                <Check size={16} style={{ color: '#16a34a' }} />
                Saved
            </div>
        );
    }

    return (
        <>
        <button
            onClick={() => handleSave()}
            disabled={isSaving}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#f6f6f6',
                color: '#333',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                cursor: isSaving ? 'wait' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
                if (!isSaving) {
                    e.currentTarget.style.backgroundColor = '#e8e8e8';
                    e.currentTarget.style.borderColor = '#d0d0d0';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f6f6f6';
                e.currentTarget.style.borderColor = '#e0e0e0';
            }}
        >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Form'}
        </button>
        {showAuth && <AuthModal
            intent="save"
            onClose={() => setShowAuth(false)}
            onAuthenticated={(signedInUser) => {
                setShowAuth(false);
                handleSave(signedInUser);
            }}
        />}
        </>
    );
}
