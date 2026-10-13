'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { User } from '@supabase/supabase-js';
import { X, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './AuthModal.module.css';

export type AuthIntent = 'save' | 'publish' | 'signin';

// Mount this only while it should be shown, so each opening starts from a clean sign-in form.
interface AuthModalProps {
    intent: AuthIntent;
    onClose: () => void;
    // Called with the signed-in user so the caller can resume the action that was blocked.
    onAuthenticated: (user: User) => void;
}

type Mode = 'signIn' | 'signUp' | 'checkEmail';

const COPY: Record<AuthIntent, { title: string; body: string; signInLabel: string; signUpLabel: string; afterConfirm: string }> = {
    publish: {
        title: 'Sign in to publish your form',
        body: 'Publishing creates a link anyone can open and fill in. Sign in so the form and every response it collects are kept safe in your account.',
        signInLabel: 'Sign in & publish',
        signUpLabel: 'Create account & publish',
        afterConfirm: 'then come back here and sign in to publish your form.',
    },
    save: {
        title: 'Sign in to save your form',
        body: 'Saving keeps this form in your account, so you can come back and keep editing whenever you like.',
        signInLabel: 'Sign in & save',
        signUpLabel: 'Create account & save',
        afterConfirm: 'then come back here and sign in to save your form.',
    },
    signin: {
        title: 'Log in to FormBuilder',
        body: 'See all your saved forms in one place and pick up where you left off, on any device.',
        signInLabel: 'Log in',
        signUpLabel: 'Create account',
        afterConfirm: 'then come back here and log in.',
    },
};

// Turn Supabase's terse auth errors into something a person can act on.
function friendlyError(message: string, mode: Mode): string {
    const m = message.toLowerCase();
    if (m.includes('invalid login credentials')) {
        return "That email and password don't match. Check for typos, or create an account if you're new.";
    }
    if (m.includes('email not confirmed')) {
        return 'Please confirm your email first. Check your inbox for the link we sent you.';
    }
    if (m.includes('already registered') || m.includes('already exists')) {
        return 'An account with this email already exists. Sign in instead.';
    }
    if (m.includes('password') && m.includes('at least')) {
        return 'Use a password with at least 6 characters.';
    }
    if (m.includes('rate limit') || m.includes('too many')) {
        return 'Too many attempts. Wait a minute and try again.';
    }
    if (m.includes('fetch') || m.includes('network')) {
        return "We couldn't reach the server. Check your connection and try again.";
    }
    return mode === 'signUp'
        ? "We couldn't create your account. Please try again."
        : "We couldn't sign you in. Please try again.";
}

export function AuthModal({ intent, onClose, onAuthenticated }: AuthModalProps) {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState<Mode>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [submitting, onClose]);

    if (typeof document === 'undefined') return null;

    const copy = COPY[intent];

    const switchMode = (next: Mode) => {
        setMode(next);
        setError(null);
        setTimeout(() => emailRef.current?.focus(), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        const result = mode === 'signUp'
            ? await signUp(email.trim(), password)
            : await signIn(email.trim(), password);

        setSubmitting(false);

        if (result.error) {
            setError(friendlyError(result.error, mode));
        } else if (result.needsConfirmation) {
            setMode('checkEmail');
        } else if (result.user) {
            onAuthenticated(result.user);
        }
    };

    const content = mode === 'checkEmail' ? (
        <div className={styles.body}>
            <div className={styles.iconBadge}>
                <Mail size={22} />
            </div>
            <h2 id="auth-modal-title" className={styles.title}>Check your inbox</h2>
            <p className={styles.description}>
                We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account,
                {copy.afterConfirm}
            </p>
            {intent !== 'signin' && <p className={styles.reassurance}>Keep this tab open. Your form will still be here.</p>}
            <button type="button" className={styles.primaryButton} onClick={() => switchMode('signIn')}>
                I&apos;ve confirmed, sign me in
            </button>
        </div>
    ) : (
        <div className={styles.body}>
            <div className={styles.iconBadge}>
                <Lock size={22} />
            </div>
            <h2 id="auth-modal-title" className={styles.title}>
                {mode === 'signUp' ? 'Create your free account' : copy.title}
            </h2>
            <p className={styles.description}>{copy.body}</p>

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && (
                    <div className={styles.error} role="alert">
                        {error}
                    </div>
                )}

                <label className={styles.field}>
                    <span className={styles.label}>Email</span>
                    <input
                        ref={emailRef}
                        autoFocus
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        placeholder="you@company.com"
                        required
                    />
                </label>

                <label className={styles.field}>
                    <span className={styles.label}>Password</span>
                    <div className={styles.passwordWrap}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder={mode === 'signUp' ? 'At least 6 characters' : 'Your password'}
                            minLength={mode === 'signUp' ? 6 : undefined}
                            required
                        />
                        <button
                            type="button"
                            className={styles.revealButton}
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </label>

                <button type="submit" className={styles.primaryButton} disabled={submitting}>
                    {submitting && <Loader2 size={16} className={styles.spin} />}
                    {submitting
                        ? (mode === 'signUp' ? 'Creating account…' : 'Signing in…')
                        : (mode === 'signUp' ? copy.signUpLabel : copy.signInLabel)}
                </button>
            </form>

            {intent !== 'signin' && <p className={styles.reassurance}>Your form stays exactly as it is while you sign in.</p>}

            <p className={styles.switch}>
                {mode === 'signUp' ? (
                    <>Already have an account?{' '}
                        <button type="button" className={styles.linkButton} onClick={() => switchMode('signIn')}>
                            Sign in
                        </button>
                    </>
                ) : (
                    <>New here?{' '}
                        <button type="button" className={styles.linkButton} onClick={() => switchMode('signUp')}>
                            Create a free account
                        </button>
                    </>
                )}
            </p>
        </div>
    );

    return createPortal(
        <div
            className={styles.backdrop}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose();
            }}
        >
            <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    disabled={submitting}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
                {content}
            </div>
        </div>,
        document.body
    );
}
