import { useState } from 'react';

interface WelcomeScreenProps {
    onStart: (difficultyLevel: number, name: string) => void;
    onViewAuth: () => void;
    onViewDashboard?: () => void;
    isLoading: boolean;
    userName?: string;
    isOffline?: boolean;
}

export function WelcomeScreen({ onStart, onViewAuth, onViewDashboard, isLoading, userName, isOffline = false }: WelcomeScreenProps) {
    const [name, setName] = useState(userName || '');

    return (
        <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
            <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

            {/* Offline Startup Banner */}
            {isOffline && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-300 py-3 px-4 text-center text-sm font-medium z-50 flex items-center justify-center gap-2 backdrop-blur-md">
                    <span>⚠️</span>
                    <span>You are currently offline. You can still take the test — results will be saved to your device and synced when you reconnect.</span>
                </div>
            )}

            {/* Top navigation */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                {onViewDashboard && (
                    <button onClick={onViewDashboard} className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-2">
                        <span>📊 Dashboard</span>
                    </button>
                )}
                <button onClick={onViewAuth} className="btn-primary !py-2 !px-4 text-sm">
                    {userName ? 'Switch Account' : 'Login / Sign Up'}
                </button>
            </div>

            <div className="max-w-xl w-full space-y-6 relative z-10">
                {/* Logo / Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl animate-glow">
                        <span className="text-5xl">🧠</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        AITA
                    </h1>
                    <p className="text-white/60 text-lg">
                        Adaptive Diagnostic &amp; Cognitive Profiler
                    </p>
                </div>

                {/* Info Card */}
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-xl font-bold text-center">How It Works</h2>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="p-4 rounded-2xl bg-white/5 space-y-2 border border-white/5">
                            <h3 className="font-semibold text-primary-300 flex items-center gap-2">
                                <span>1.</span> One Mixed Test — 12 Questions
                            </h3>
                            <p className="text-white/60 leading-relaxed text-xs">
                                Mathematical, verbal, logical, general knowledge and visual diagram questions — a mix of MCQs and written answers, randomly selected so every attempt is different.
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 space-y-2 border border-white/5">
                            <h3 className="font-semibold text-accent-300 flex items-center gap-2">
                                <span>2.</span> Instant Result Dashboard
                            </h3>
                            <p className="text-white/60 leading-relaxed text-xs">
                                Submit once and see your result dashboard immediately — accuracy, cognitive profile, decision style and behavioural metrics.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Name Input Card (only shown if not logged in) */}
                {!userName && (
                    <div className="glass-card p-6 space-y-3">
                        <h3 className="font-semibold text-center">Your Name</h3>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., Ayesha Khan (used for your dashboard)"
                            className="text-input"
                        />
                        <p className="text-white/40 text-xs text-center">
                            Used to save your results to your personal dashboard. Leave blank to stay anonymous.
                        </p>
                    </div>
                )}

                {/* Start */}
                <div className="flex justify-center">
                    <button
                        onClick={() => onStart(5, userName || name.trim() || 'Anonymous')}
                        disabled={isLoading}
                        className="btn-primary text-lg py-4 px-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin">🧠</span>
                                <span>Preparing Test...</span>
                            </>
                        ) : (
                            <>
                                <span>Start Test</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </section>
    );
}
