'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<AuthResult>;
    signUp: (email: string, password: string) => Promise<AuthResult>;
    signOut: () => Promise<void>;
}

export interface AuthResult {
    error: string | null;
    user: User | null;
    // True when sign-up succeeded but the email must be confirmed before a session exists.
    needsConfirmation?: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => ({ error: null, user: null }),
    signUp: async () => ({ error: null, user: null }),
    signOut: async () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Reuse the stored session, or silently sign in as an anonymous guest.
        // Requires "Anonymous sign-ins" to be enabled in Supabase (Auth → Providers).
        supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
            if (!session) {
                const { data, error } = await supabase.auth.signInAnonymously();
                if (error) {
                    console.error('Anonymous sign-in failed:', error.message);
                }
                session = data.session;
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string): Promise<AuthResult> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null, user: data.user };
    };

    const signUp = async (email: string, password: string): Promise<AuthResult> => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        return {
            error: error?.message ?? null,
            user: data.session ? data.user : null,
            needsConfirmation: !error && !data.session,
        };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
