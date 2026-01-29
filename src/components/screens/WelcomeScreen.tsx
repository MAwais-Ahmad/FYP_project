interface WelcomeScreenProps {
    onStart: () => void;
    isLoading: boolean;
}

export function WelcomeScreen({ onStart, isLoading }: WelcomeScreenProps) {
    return (
        <section className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
            <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />
            <div className="floating-shape shape-3 w-64 h-64 bg-emerald-500 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '4s' }} />

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                {/* Logo and Title */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl animate-glow">
                        <span className="text-5xl">🧠</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        AI Quiz Assessment
                    </h1>
                    <p className="text-xl text-white/70">Adaptive Learning System</p>
                </div>

                {/* Info Card */}
                <div className="glass-card p-8 space-y-6">
                    <h2 className="text-2xl font-semibold text-center">How It Works</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-3xl">📖</div>
                            <div>
                                <strong className="block text-white">Scenario-Based</strong>
                                <span className="text-white/60 text-sm">Real-world problem solving</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-3xl">⏱️</div>
                            <div>
                                <strong className="block text-white">Timed Questions</strong>
                                <span className="text-white/60 text-sm">Some questions have time limits</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-3xl">🎯</div>
                            <div>
                                <strong className="block text-white">4 Phases</strong>
                                <span className="text-white/60 text-sm">Understanding → Planning → Execution → Reflection</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-3xl">📊</div>
                            <div>
                                <strong className="block text-white">7 Questions</strong>
                                <span className="text-white/60 text-sm">~15 minutes to complete</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Start Button */}
                <div className="flex justify-center">
                    <button
                        onClick={onStart}
                        disabled={isLoading}
                        className="btn-primary text-lg py-4 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin">🤖</span>
                                <span>Generating Unique Quiz...</span>
                            </>
                        ) : (
                            <>
                                <span>Start Assessment</span>
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
