import { useState, useEffect } from 'react';
import { register, login, forgotPassword, resetPassword, verifyEmailToken, resendVerification, AuthUser } from '../../services/api';

interface AuthScreenProps {
    onAuthSuccess: (user: AuthUser) => void;
    resetToken?: string | null;
    verifyToken?: string | null;
    onResetComplete?: () => void;
    onVerifyComplete?: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthScreen({ onAuthSuccess, resetToken, verifyToken, onResetComplete, onVerifyComplete }: AuthScreenProps) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

    // If reset token is supplied on mount, enter reset mode automatically
    useEffect(() => {
        if (resetToken) {
            setMode('reset');
            setError('');
            setSuccessMessage('');
        }
    }, [resetToken]);

    // Handle verifyToken query param on mount
    useEffect(() => {
        if (verifyToken) {
            setIsLoading(true);
            setError('');
            setSuccessMessage('Verifying your email address...');
            
            verifyEmailToken(verifyToken)
                .then((res) => {
                    setIsLoading(false);
                    if (res.success && res.user) {
                        setSuccessMessage('🎉 Your email has been verified successfully! Logging you in...');
                        setTimeout(() => {
                            onAuthSuccess(res.user!);
                        }, 1500);
                    } else if (res.success) {
                        setSuccessMessage('🎉 Your email has been verified successfully! You can now log in.');
                        setMode('login');
                    } else {
                        setError(res.error || 'Invalid or expired verification link.');
                        setMode('login');
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                    if (onVerifyComplete) onVerifyComplete();
                })
                .catch(() => {
                    setIsLoading(false);
                    setError('Failed to verify email. Please try again.');
                    setMode('login');
                });
        }
    }, [verifyToken]);

    const handleResend = async () => {
        if (!unverifiedEmail) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await resendVerification(unverifiedEmail);
            if (res.success) {
                setSuccessMessage('✉️ A new verification link has been sent to ' + unverifiedEmail);
            } else {
                setError(res.error || 'Failed to resend verification email.');
            }
        } catch {
            setError('Failed to resend verification email.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setUnverifiedEmail(null);
        setIsLoading(true);

        try {
            if (mode === 'register') {
                const result = await register(email, password, name);
                if (result.requiresVerification) {
                    setSuccessMessage(result.message || '🎉 Registration successful! Please check your email inbox and click "Yes, it\'s me" to activate your account.');
                    setUnverifiedEmail(email);
                    setPassword('');
                    setName('');
                    setMode('login');
                } else if (result.success && result.user) {
                    onAuthSuccess(result.user);
                } else {
                    setError(result.error || 'Registration failed.');
                }
            } else if (mode === 'login') {
                const result = await login(email, password);
                if (result.success && result.user) {
                    onAuthSuccess(result.user);
                } else if (result.requiresVerification) {
                    setUnverifiedEmail(email);
                    setError(result.error || 'Please verify your email before logging in.');
                } else {
                    setError(result.error || 'Invalid email or password.');
                }
            } else if (mode === 'forgot') {
                const result = await forgotPassword(email);
                if (result.success) {
                    setSuccessMessage('Check your email for the password reset link.');
                    setEmail('');
                } else {
                    setError(result.error || 'Failed to send password reset request.');
                }
            } else if (mode === 'reset') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match.');
                    setIsLoading(false);
                    return;
                }
                if (!resetToken) {
                    setError('Invalid token.');
                    setIsLoading(false);
                    return;
                }
                const result = await resetPassword(resetToken, password);
                if (result.success) {
                    setSuccessMessage('Password has been reset successfully. You can now login.');
                    setPassword('');
                    setConfirmPassword('');
                    setTimeout(() => {
                        setMode('login');
                        setSuccessMessage('');
                        if (onResetComplete) onResetComplete();
                    }, 3000);
                } else {
                    setError(result.error || 'Failed to reset password.');
                }
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
            <div
                className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36"
                style={{ animationDelay: '2s' }}
            />

            <div className="max-w-md w-full space-y-6 relative z-10">
                {/* Logo */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl animate-glow">
                        <span className="text-4xl">🧠</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        AITA
                    </h1>
                    <p className="text-sm text-white/50">
                        AI-Powered Adaptive Learning Profile
                    </p>
                </div>

                {/* Auth Card */}
                <div className="glass-card p-6 space-y-5">
                    {/* Header Text based on Mode */}
                    <div className="text-center">
                        {mode === 'forgot' && (
                            <>
                                <h2 className="text-xl font-bold text-white">Reset Password</h2>
                                <p className="text-xs text-white/40 mt-1">Enter your email to receive a secure link</p>
                            </>
                        )}
                        {mode === 'reset' && (
                            <>
                                <h2 className="text-xl font-bold text-white">Set New Password</h2>
                                <p className="text-xs text-white/40 mt-1">Create a secure password for your account</p>
                            </>
                        )}
                    </div>

                    {/* Mode Toggle (only for login/register modes) */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="flex rounded-xl bg-white/5 p-1">
                            <button
                                onClick={() => {
                                    setMode('login');
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    mode === 'login'
                                        ? 'bg-white/10 text-white shadow-lg'
                                        : 'text-white/50 hover:text-white/70'
                                }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => {
                                    setMode('register');
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    mode === 'register'
                                        ? 'bg-white/10 text-white shadow-lg'
                                        : 'text-white/50 hover:text-white/70'
                                }`}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div className="space-y-1.5">
                                <label className="text-sm text-white/60">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Ayesha Khan"
                                    className="text-input"
                                    required
                                />
                            </div>
                        )}

                        {mode !== 'reset' && (
                            <div className="space-y-1.5">
                                <label className="text-sm text-white/60">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="text-input"
                                    required
                                />
                            </div>
                        )}

                        {(mode === 'login' || mode === 'register') && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm text-white/60">Password</label>
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMode('forgot');
                                                setError('');
                                                setSuccessMessage('');
                                            }}
                                            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                                        >
                                            Forgot Password?
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={
                                        mode === 'register'
                                            ? 'Min. 6 characters'
                                            : 'Enter your password'
                                    }
                                    className="text-input"
                                    required
                                    minLength={6}
                                />
                            </div>
                        )}

                        {mode === 'reset' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-sm text-white/60">New Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        className="text-input"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm text-white/60">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Retype password"
                                        className="text-input"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex items-start gap-2">
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                                {unverifiedEmail && (
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={isLoading}
                                        className="text-xs text-primary-300 hover:text-primary-200 underline text-left mt-1"
                                    >
                                        Resend "Yes, it's me" verification link to {unverifiedEmail}
                                    </button>
                                )}
                            </div>
                        )}

                        {successMessage && (
                            <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex items-start gap-2">
                                    <span>✅</span>
                                    <span>{successMessage}</span>
                                </div>
                                {unverifiedEmail && (
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={isLoading}
                                        className="text-xs text-primary-300 hover:text-primary-200 underline text-left mt-1"
                                    >
                                        Didn't receive it? Click to resend email
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> Please wait...
                                </span>
                            ) : mode === 'login' ? (
                                'Login'
                            ) : mode === 'register' ? (
                                'Create Account'
                            ) : mode === 'forgot' ? (
                                'Send Reset Link'
                            ) : (
                                'Update Password'
                            )}
                        </button>

                        {(mode === 'forgot' || (mode === 'reset' && !successMessage)) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('login');
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors pt-2 block"
                            >
                                ← Back to Login
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
}
