import { useState } from 'react';

interface WelcomeScreenProps {
    onStart: (difficultyLevel: number, name: string) => void;
    onViewTeacherDashboard: () => void;
    onViewStudentDashboard: () => void;
    isLoading: boolean;
}

const difficultyLabels: Record<number, { label: string; emoji: string; color: string }> = {
    1: { label: 'Very Easy', emoji: '🟢', color: 'text-green-400' },
    2: { label: 'Easy', emoji: '🟢', color: 'text-green-400' },
    3: { label: 'Easy-Medium', emoji: '🟡', color: 'text-lime-400' },
    4: { label: 'Medium', emoji: '🟡', color: 'text-yellow-400' },
    5: { label: 'Medium', emoji: '🟡', color: 'text-yellow-400' },
    6: { label: 'Medium-Hard', emoji: '🟠', color: 'text-orange-400' },
    7: { label: 'Hard', emoji: '🟠', color: 'text-orange-400' },
    8: { label: 'Hard', emoji: '🔴', color: 'text-red-400' },
    9: { label: 'Very Hard', emoji: '🔴', color: 'text-red-400' },
    10: { label: 'Expert', emoji: '💀', color: 'text-red-500' },
};

export function WelcomeScreen({ onStart, onViewTeacherDashboard, onViewStudentDashboard, isLoading }: WelcomeScreenProps) {
    const [difficulty, setDifficulty] = useState(5);
    const [name, setName] = useState('');
    const info = difficultyLabels[difficulty];

    return (
        <section className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
            <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

            {/* Dashboard quick links */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button onClick={onViewStudentDashboard} className="btn-secondary !py-2 !px-4 text-sm">📈 My Dashboard</button>
                <button onClick={onViewTeacherDashboard} className="btn-secondary !py-2 !px-4 text-sm">👨‍🏫 Teacher</button>
            </div>

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                {/* Title */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl animate-glow">
                        <span className="text-5xl">🧠</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        AITA Assessment
                    </h1>
                    <p className="text-lg text-white/60">AI-Powered Adaptive Learning Profile</p>
                </div>

                {/* How it works */}
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-center">How It Works</h2>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <span className="text-2xl">🎭</span>
                            <div>
                                <strong className="block text-white">Real Scenarios</strong>
                                <span className="text-white/50">Ethical dilemmas, crises, team conflicts & more</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <span className="text-2xl">🔄</span>
                            <div>
                                <strong className="block text-white">Up to 3 Rounds</strong>
                                <span className="text-white/50">Continue or finish after each round</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <span className="text-2xl">⏱️</span>
                            <div>
                                <strong className="block text-white">Timed + Untimed</strong>
                                <span className="text-white/50">Some questions have time pressure</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <span className="text-2xl">📊</span>
                            <div>
                                <strong className="block text-white">Learner Profile</strong>
                                <span className="text-white/50">Get your cognitive learning type</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Name */}
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

                {/* Difficulty Slider */}
                <div className="glass-card p-6 space-y-4">
                    <h3 className="font-semibold text-center">Choose Your Starting Difficulty</h3>
                    <div className="space-y-3">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={difficulty}
                            onChange={e => setDifficulty(parseInt(e.target.value))}
                            className="confidence-slider"
                        />
                        <div className="flex justify-between text-xs text-white/30">
                            {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                <span key={n} className={difficulty === n ? `${info.color} font-bold` : ''}>{n}</span>
                            ))}
                        </div>
                        <div className="text-center space-y-1">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-2xl">{info.emoji}</span>
                                <span className={`text-2xl font-bold ${info.color}`}>Level {difficulty}</span>
                                <span className="text-2xl">{info.emoji}</span>
                            </div>
                            <p className="text-white/50 text-sm">{info.label} — questions will match this complexity</p>
                        </div>
                    </div>
                </div>

                {/* Start */}
                <div className="flex justify-center">
                    <button
                        onClick={() => onStart(difficulty, name.trim() || 'Anonymous')}
                        disabled={isLoading}
                        className="btn-primary text-lg py-4 px-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin">🤖</span>
                                <span>Generating Questions...</span>
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
