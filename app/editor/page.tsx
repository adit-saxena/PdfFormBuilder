'use client';

import { useAuth } from '../contexts/AuthContext';
import { FormBuilder } from '../components/FormBuilder';

// Force dynamic rendering (required for client-side auth)
export const dynamic = 'force-dynamic';

export default function EditorPage() {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #000',
                    borderTopColor: 'transparent',
                    borderRadius: '0',
                    animation: 'spin 0.8s linear infinite'
                }} />
            </div>
        );
    }

    return <FormBuilder />;
}
