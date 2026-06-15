import { useState } from 'react';
import { ScenarioResult } from '../../types/quiz.types';

interface InterScenarioScreenProps {
    completedScenarioNumber: number;
    scenarioResult: ScenarioResult | null;
    isLoading: boolean;
    onContinue: (newDifficulty: number) => void;
    onFinish: () => void;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function InterScenarioScreen({
    completedScenarioNumber,
    scenarioResult,
    isLoading,
    onContinue,
    onFinish,
}: InterScenarioScreenProps) {
    const [nextDifficulty, setNextDifficulty] = useState(scenarioResult?.difficultyLevel ?? 5);
    const isMaxIterations = completedScenarioNumber >= 3;

    const perfScore = scenarioResult?.performanceScore ?? 0;
    const perfPercent = Math.round(perfScore * 100);

    const getPerfLabel = (score: number) => {
        if (score >= 0.75) return { label: 'Excellent', color: 'text-emerald-400' };
        if (score >= 0.55) return { label: 'Good', color: 'text-blue-400' };
        if (score >= 0.38) return { label: 'Moderate', color: 'text-amber-400' };
        return { label: 'Needs Work', color: 'text-rose-400' };
    };
    const perf = getPerfLabel(perfScore);

    const stats = scenarioResult
        ? [
              { icon: '⏱️', label: 'Avg Response', value: formatTime(scenarioResult.avgResponseTime) },
              { icon: '🔄', label: 'Revisions', value: `${scenarioResult.totalAnswerChanges}` },
              { icon: '↩️', label: 'Backtracks', value: `${scenarioResult.backtrackCount}` },
              { icon: '🎯', label: 'Difficulty', value: `${scenarioResult.difficultyLevel}/10` },
              { icon: '💬', label: 'Confidence', value: `${scenarioResult.confidence}/10` },
          ]
        : [];

    return (
        <section className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            <div className="floating-shape w-96 h-96 bg-primary-500 -top-48 -right-48 opacity-10" />

            <div className="max-w-2xl w-full space-y-6 relative z-10">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-2xl text-4xl">
                        ✅
                    </div>
                    <h1 className="text-3xl font-bold">
                        Round {completedScenarioNumber} Complete!
                    </h1>
                    {scenarioResult && (
                        <p className="text-white/60">{scenarioResult.scenarioTitle}</p>
                    )}
                </div>

                {/* Performance */}
                {scenarioResult && (
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Performance Snapshot</h2>
                            <span className={`text-xl font-bold ${perf.color}`}>{perfPercent}% — {perf.label}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                                style={{ width: `${perfPercent}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {stats.map((s, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 text-center">
                                    <span className="text-lg">{s.icon}</span>
                                    <span className="text-xs text-white/40">{s.label}</span>
                                    <span className="font-semibold text-sm">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Max iterations reached */}
                {isMaxIterations ? (
                    <div className="glass-card p-6 text-center space-y-4">
                        <p className="text-lg">🎓 You've completed all 3 rounds!</p>
                        <p className="text-white/60 text-sm">Your full learner profile is ready.</p>
                        <button onClick={onFinish} className="btn-primary text-lg py-4 px-10">
                            <span>View My Results</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Difficulty bar for next round */}
                        <div className="glass-card p-6 space-y-4">
                            <h3 className="font-semibold text-center">How hard did you find that round?</h3>
                            <p className="text-white/50 text-sm text-center">
                                Set the difficulty for your next round based on how you felt
                            </p>
                            <div className="space-y-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={nextDifficulty}
                                    onChange={e => setNextDifficulty(parseInt(e.target.value))}
                                    className="confidence-slider"
                                />
                                <div className="flex justify-between text-xs text-white/30">
                                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                        <span key={n} className={nextDifficulty === n ? 'text-primary-400 font-bold' : ''}>{n}</span>
                                    ))}
                                </div>
                                <p className="text-center text-white/60">
                                    Next round difficulty: <strong className="text-white text-lg">{nextDifficulty}/10</strong>
                                </p>
                            </div>
                        </div>

                        {/* Continue or Finish */}
                        <div className="flex gap-4 justify-center">
                            <button onClick={onFinish} className="btn-secondary py-4 px-8">
                                <span>Finish & View Results</span>
                            </button>
                            <button
                                onClick={() => onContinue(nextDifficulty)}
                                disabled={isLoading}
                                className="btn-primary py-4 px-8 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin">🤖</span>
                                        <span>Generating Round {completedScenarioNumber + 1}...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue to Round {completedScenarioNumber + 1}</span>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
