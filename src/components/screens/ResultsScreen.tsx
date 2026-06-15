import { useState, useEffect } from 'react';
import {
    Answers,
    CategoryResult,
    OverallMetrics,
    Question,
    ScenarioResult,
} from '../../types/quiz.types';
import { classifyLearner, LEARNER_CATEGORIES } from '../../utils/classifyLearner';

interface ResultsScreenProps {
    questions: Question[];
    answers: Answers;
    calculateMetrics: () => OverallMetrics;
    questionsMetrics: Record<
        number,
        { totalTimeSpent: number; timeToFirstInteraction: number | null; answerChanges: number; responseLength: number }
    >;
    scenarioResults: ScenarioResult[];
    tokensUsed: number;
    totalCost: number;
    onRestart: () => void;
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function ScenarioProgressCard({ results }: { results: ScenarioResult[] }) {
    if (results.length === 0) return null;
    return (
        <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">📈 Learning Curve</h2>
            <div className="flex items-end gap-4">
                {results.map((r, i) => {
                    const pct = Math.round(r.performanceScore * 100);
                    return (
                        <div key={i} className="flex-1 space-y-2 text-center">
                            <div className="text-sm font-medium text-white/60">S{r.scenarioNumber}</div>
                            <div className="relative h-24 bg-white/5 rounded-xl overflow-hidden flex items-end">
                                <div
                                    className="w-full bg-gradient-to-t from-primary-500 to-accent-500 transition-all duration-700"
                                    style={{ height: `${Math.max(pct, 8)}%` }}
                                />
                            </div>
                            <div className="text-sm font-bold">{pct}%</div>
                            <div className="text-xs text-white/40 capitalize">{r.decisionStyle}</div>
                        </div>
                    );
                })}
                {results.length > 1 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 pb-8">
                        {results[results.length - 1].performanceScore > results[0].performanceScore ? (
                            <>
                                <span className="text-2xl">📈</span>
                                <span className="text-xs text-emerald-400 font-medium">Improving</span>
                            </>
                        ) : results[results.length - 1].performanceScore < results[0].performanceScore - 0.05 ? (
                            <>
                                <span className="text-2xl">📉</span>
                                <span className="text-xs text-rose-400 font-medium">Declining</span>
                            </>
                        ) : (
                            <>
                                <span className="text-2xl">➡️</span>
                                <span className="text-xs text-blue-400 font-medium">Stable</span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function ResultsScreen({
    questions,
    answers,
    calculateMetrics,
    questionsMetrics,
    scenarioResults,
    tokensUsed,
    totalCost,
    onRestart,
}: ResultsScreenProps) {
    const [categoryResult, setCategoryResult] = useState<CategoryResult | null>(null);

    const overall = calculateMetrics();

    const lastQuestion = questions[questions.length - 1];
    const reflectionAnswer = (answers[lastQuestion?.id] as string) || '';
    const [confidenceStr] = reflectionAnswer.split('|');
    const confidence = parseInt(confidenceStr) || 5;

    // Classify learner using data from the latest scenario result
    useEffect(() => {
        const latestResult = scenarioResults[scenarioResults.length - 1];
        if (latestResult) {
            const result = classifyLearner({
                overall,
                cognitive: latestResult.cognitive,
                scenarioResults,
                confidence,
                accuracyScore: latestResult.accuracyScore,
            });
            setCategoryResult(result);
        }
    }, [scenarioResults, overall, confidence]);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const primary = categoryResult
        ? LEARNER_CATEGORIES[categoryResult.primary_category]
        : null;
    const secondary =
        categoryResult?.category_blend && categoryResult.secondary_category
            ? LEARNER_CATEGORIES[categoryResult.secondary_category]
            : null;

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="text-center space-y-3 py-6">
                <div className="text-6xl">🎓</div>
                <h1 className="text-3xl md:text-4xl font-bold">Assessment Complete!</h1>
                <p className="text-white/60">
                    {scenarioResults.length} scenario{scenarioResults.length !== 1 ? 's' : ''} completed
                    &nbsp;•&nbsp; Full learner profile below
                </p>
            </div>

            {/* ── LEARNER CATEGORY CARD (PRIMARY) ────────────────────────────── */}
            {categoryResult && primary && (
                <div className={`glass-card p-6 md:p-8 border bg-gradient-to-br ${primary.color}/20 border-white/20 space-y-5`}>
                    <div className="flex flex-wrap items-start gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${primary.color} flex items-center justify-center text-3xl shadow-lg`}>
                            {primary.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">
                                Your Learner Profile
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold">{primary.name}</h2>
                            <p className="text-white/60 text-sm mt-1">
                                Affects approximately {primary.prevalence} of students
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-white/40 mb-1">Confidence</div>
                            <div className="text-2xl font-bold text-white">
                                {Math.round(categoryResult.primary_confidence * 100)}%
                            </div>
                        </div>
                    </div>

                    <p className="text-white/80 leading-relaxed">{primary.description}</p>

                    {/* Pattern bullets */}
                    <div>
                        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                            Detected Patterns
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {primary.pattern.map((p, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                                    <span className={`mt-0.5 w-4 h-4 rounded-full bg-gradient-to-br ${primary.color} flex items-center justify-center text-white text-xs shrink-0`}>
                                        ✓
                                    </span>
                                    {p}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Secondary blend */}
                    {secondary && categoryResult.secondary_category && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-2xl">{secondary.emoji}</span>
                            <div className="text-sm">
                                <span className="text-white/50">Secondary trait detected: </span>
                                <strong>{secondary.name}</strong>
                                <span className="text-white/40 ml-2">
                                    ({Math.round((categoryResult.secondary_confidence ?? 0) * 100)}% match)
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── PERSONALIZED RECOMMENDATIONS ───────────────────────────────── */}
            {primary && (
                <div className="grid md:grid-cols-2 gap-4">
                    {/* YouTube */}
                    <div className="glass-card p-5 space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <span className="text-xl">📺</span> Recommended Learning Topics
                        </h3>
                        <p className="text-white/50 text-xs">
                            {primary.solutionType === 'excelling'
                                ? 'You\'re excelling — these will push you further'
                                : 'Curated to address your specific growth areas'}
                        </p>
                        <ul className="space-y-2">
                            {primary.youtubeTopics.map((t, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                    <span className="text-red-400 mt-0.5 shrink-0">▶</span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* AI Sessions */}
                    <div className="glass-card p-5 space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <span className="text-xl">🤖</span> Suggested AI Practice Sessions
                        </h3>
                        <p className="text-white/50 text-xs">Targeted exercises for your learner profile</p>
                        <ul className="space-y-2">
                            {primary.aiSessionTopics.map((t, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                    <span className="text-primary-400 mt-0.5 shrink-0">→</span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                        <div className="pt-2 border-t border-white/10">
                            <p className="text-xs text-white/40">🎯 Focus area:</p>
                            <p className="text-sm font-medium text-white/80">{primary.focusArea}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LEARNING CURVE ──────────────────────────────────────────────── */}
            <ScenarioProgressCard results={scenarioResults} />

            {/* ── ML FEATURE VECTOR ───────────────────────────────────────────── */}
            <div className="glass-card p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        📊 ML Feature Vector
                    </h2>
                    <p className="text-white/50 text-xs mt-1">
                        These raw features feed the Random Forest classifier
                    </p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                    {/* Timing */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-primary-300 text-xs uppercase tracking-wide">
                            ⏱️ Timing Features
                        </h3>
                        <div className="space-y-1">
                            {[
                                ['avg_decision_time', `${overall.avgResponseTime.toFixed(1)}s`],
                                ['time_variance', overall.timeVariance],
                                ['time_trend', overall.timeTrend],
                                ['rushed_decisions', overall.rushedDecisions],
                                ['overthinking_count', overall.overthinkingCount],
                                ['overtime_count', overall.overtimeCount],
                            ].map(([k, v]) => (
                                <div key={k as string} className="flex justify-between gap-2">
                                    <span className="text-white/50 font-mono text-xs">{k}</span>
                                    <span className="text-white/80 font-medium">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Behavioral */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-accent-300 text-xs uppercase tracking-wide">
                            🔄 Behavioral Features
                        </h3>
                        <div className="space-y-1">
                            {[
                                ['answer_changes', overall.totalAnswerChanges],
                                ['backtrack_count', overall.backtrackCount],
                                ['decision_style', overall.decisionStyle],
                                ['confidence_rating', `${confidence}/10`],
                                ['questions_answered', overall.questionsAnswered],
                                ['skipped_questions', overall.skippedQuestions],
                            ].map(([k, v]) => (
                                <div key={k as string} className="flex justify-between gap-2">
                                    <span className="text-white/50 font-mono text-xs">{k}</span>
                                    <span className="text-white/80 font-medium capitalize">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cognitive & Accuracy */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-emerald-300 text-xs uppercase tracking-wide">
                            🤖 Cognitive Features
                        </h3>
                        <div className="space-y-1">
                            {(() => {
                                const latestResult = scenarioResults[scenarioResults.length - 1];
                                if (!latestResult) return null;
                                return [
                                    ['accuracy_score', `${(latestResult.accuracyScore * 100).toFixed(0)}%`],
                                    ['reflection_depth', `${(latestResult.cognitive.reflection_depth * 100).toFixed(0)}%`],
                                    ['self_awareness', `${(latestResult.cognitive.self_awareness * 100).toFixed(0)}%`],
                                    ['learning_orient.', `${(latestResult.cognitive.learning_orientation * 100).toFixed(0)}%`],
                                    ['creativity_score', `${(latestResult.cognitive.creativity_score * 100).toFixed(0)}%`],
                                    ['primary_category', categoryResult?.primary_emoji ?? '–'],
                                ].map(([k, v]) => (
                                    <div key={k as string} className="flex justify-between gap-2">
                                        <span className="text-white/50 font-mono text-xs">{k}</span>
                                        <span className="text-white/80 font-medium">{v}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PER-QUESTION TABLE ───────────────────────────────────────────── */}
            <div className="glass-card p-6 overflow-x-auto space-y-3">
                <h2 className="text-lg font-semibold">📋 Per-Question Metrics</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-white/50 text-left">
                            <th className="p-2">Q</th>
                            <th className="p-2">Phase</th>
                            <th className="p-2">Time Spent</th>
                            <th className="p-2">Time to Start</th>
                            <th className="p-2">Revisions</th>
                            <th className="p-2">Response Length</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.map(q => {
                            const m = questionsMetrics[q.id] || {};
                            return (
                                <tr key={q.id} className="border-t border-white/10 hover:bg-white/3">
                                    <td className="p-2 font-medium">Q{q.id}</td>
                                    <td className="p-2">
                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">
                                            P{q.phase}
                                        </span>
                                    </td>
                                    <td className="p-2">{m.totalTimeSpent ? formatDuration(m.totalTimeSpent) : '–'}</td>
                                    <td className="p-2">
                                        {m.timeToFirstInteraction ? `${m.timeToFirstInteraction.toFixed(1)}s` : '–'}
                                    </td>
                                    <td className="p-2">{m.answerChanges || 0}</td>
                                    <td className="p-2">{m.responseLength ? `${m.responseLength} chars` : '–'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── FOOTER ──────────────────────────────────────────────────────── */}
            <div className="glass-card p-4 text-center space-y-1">
                <p className="text-white/50 text-sm">
                    💰 Session cost:{' '}
                    <strong className="text-white">~${totalCost.toFixed(4)}</strong>{' '}
                    ({tokensUsed} tokens)
                </p>
                <p className="text-white/30 text-xs">
                    gpt-4o-mini — scenario generation + reflection analysis
                </p>
            </div>

            <div className="flex justify-center">
                <button onClick={onRestart} className="btn-primary text-lg py-4 px-10">
                    <span>Start New Assessment</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                </button>
            </div>
        </section>
    );
}
