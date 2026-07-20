import { StudentRecord } from '../../utils/storage';
import { LEARNER_CATEGORIES } from '../../utils/classifyLearner';
import { RadarChart, StatCard } from '../ui/CognitiveProfileViz';

interface RecordDetailProps {
    record: StudentRecord;
    onBack: () => void;
}

export function RecordDetail({ record, onBack }: RecordDetailProps) {
    const primary = LEARNER_CATEGORIES[record.primaryCategory];
    const secondary = record.secondaryCategory
        ? LEARNER_CATEGORIES[record.secondaryCategory]
        : null;

    const overall = record.overall;
    const latest = record.scenarioResults && record.scenarioResults.length > 0
        ? record.scenarioResults[record.scenarioResults.length - 1]
        : null;
    const confidence = Math.round(record.confidence);

    const speedSub = overall.avgResponseTime < 30 ? 'Quick & efficient' : overall.avgResponseTime <= 80 ? 'Balanced pace' : 'Deliberate & thorough';
    const changesSub = overall.totalAnswerChanges === 0 ? 'Decisive' : overall.totalAnswerChanges <= 4 ? 'Thoughtful reconsideration' : 'Frequent revisions';
    const backtrackSub = overall.backtrackCount === 0 ? 'No path deviation' : overall.backtrackCount <= 2 ? 'Minimal path deviation' : 'Explored back & forth';
    const confSub = confidence >= 8 ? 'High self-assurance' : confidence >= 5 ? 'Measured assurance' : confidence > 0 ? 'Tentative' : 'Disengaged';

    const accuracyVal = latest?.accuracyScore ?? record.accuracyScore ?? 0;
    const reflectionVal = latest?.cognitive?.reflection_depth ?? record.cognitive?.reflection_depth ?? 0;
    const selfAwareVal = latest?.cognitive?.self_awareness ?? record.cognitive?.self_awareness ?? 0;
    const creativityVal = latest?.cognitive?.creativity_score ?? record.cognitive?.creativity_score ?? 0;
    const learningVal = latest?.cognitive?.learning_orientation ?? record.cognitive?.learning_orientation ?? 0;

    const radarAxes = [
        { label: 'Accuracy', value: accuracyVal },
        { label: 'Reflection', value: reflectionVal },
        { label: 'Self-Aware', value: selfAwareVal },
        { label: 'Creativity', value: creativityVal },
        { label: 'Learning', value: learningVal },
        { label: 'Confidence', value: confidence / 10 },
    ];

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const formattedDate = new Date(record.date).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-5xl mx-auto">
            {/* ── HEADER WITH BACK BUTTON ──────────────────────────────────────── */}
            <div className="flex items-center gap-4 py-2">
                <button onClick={onBack} className="btn-secondary !py-2 !px-4 text-sm shrink-0 flex items-center gap-2">
                    <span>←</span> Back to Dashboard
                </button>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl shadow-lg shrink-0">
                        ✓
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-3xl font-bold truncate">Assessment Breakdown: {record.name}</h1>
                        <p className="text-white/50 text-xs md:text-sm">
                            {record.scenariosCompleted} scenario{record.scenariosCompleted !== 1 ? 's' : ''} processed — completed on {formattedDate}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── LEARNER CATEGORY HERO (IMAGE 1 TOP) ───────────────────────── */}
            {primary && (
                <div className="glass-card p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Emoji tile */}
                        <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${primary.color} flex items-center justify-center text-6xl shadow-lg shrink-0 self-center sm:self-start`}>
                            {primary.emoji}
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                            <div className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                                Learner Category
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-2xl md:text-3xl font-bold">{primary.name}</h2>
                                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-semibold">
                                    {Math.round(record.primaryConfidence * 100)}% Confidence
                                </span>
                            </div>
                            <p className="text-white/70 leading-relaxed">{primary.description}</p>

                            {secondary && (
                                <div className="inline-flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                    <span className="text-2xl">{secondary.emoji}</span>
                                    <div className="text-sm leading-tight">
                                        <div className="text-white/40 text-xs uppercase tracking-wide">Secondary Category</div>
                                        <strong>{secondary.name}</strong>
                                    </div>
                                </div>
                            )}

                            {/* Pattern bullets */}
                            <div className="grid sm:grid-cols-2 gap-2 pt-1">
                                {primary.pattern.map((p, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm text-white/60">
                                        <span className={`mt-0.5 w-4 h-4 rounded-full bg-gradient-to-br ${primary.color} flex items-center justify-center text-white text-[10px] shrink-0`}>
                                            ✓
                                        </span>
                                        {p}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STAT CARDS + COGNITIVE RADAR (IMAGE 1 BOTTOM) ──────────────── */}
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                    <StatCard icon="⏱️" value={`${overall.avgResponseTime.toFixed(0)}s`} label="Avg Decision Time" sub={speedSub} />
                    <StatCard icon="✏️" value={`${overall.totalAnswerChanges}`} label="Answer Changes" sub={changesSub} />
                    <StatCard icon="↩️" value={`${overall.backtrackCount}`} label="Backtracks" sub={backtrackSub} />
                    <StatCard icon="📊" value={`${confidence}/10`} label="Confidence" sub={confSub} />
                </div>

                {/* Cognitive profile radar */}
                <div className="glass-card p-5 space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                        <span>🧭</span> Cognitive Profile
                    </h3>
                    <RadarChart axes={radarAxes} />
                </div>
            </div>

            {/* ── ML FEATURE VECTOR (IMAGE 2) ─────────────────────────────────── */}
            <div className="glass-card p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">📊 ML Feature Vector</h2>
                    <p className="text-white/50 text-xs mt-1">These raw features feed the Random Forest classifier</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                    {/* Timing */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-primary-300 text-xs uppercase tracking-wide flex items-center gap-1">
                            <span>⏱️</span> TIMING FEATURES
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
                        <h3 className="font-medium text-accent-300 text-xs uppercase tracking-wide flex items-center gap-1">
                            <span>🔄</span> BEHAVIORAL FEATURES
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
                        <h3 className="font-medium text-emerald-300 text-xs uppercase tracking-wide flex items-center gap-1">
                            <span>🤖</span> COGNITIVE FEATURES
                        </h3>
                        <div className="space-y-1">
                            {[
                                ['accuracy_score', `${(accuracyVal * 100).toFixed(0)}%`],
                                ['reflection_depth', `${(reflectionVal * 100).toFixed(0)}%`],
                                ['self_awareness', `${(selfAwareVal * 100).toFixed(0)}%`],
                                ['learning_orient.', `${(learningVal * 100).toFixed(0)}%`],
                                ['creativity_score', `${(creativityVal * 100).toFixed(0)}%`],
                                ['primary_category', record.primaryEmoji || primary?.emoji || '–'],
                            ].map(([k, v]) => (
                                <div key={k as string} className="flex justify-between gap-2">
                                    <span className="text-white/50 font-mono text-xs">{k}</span>
                                    <span className="text-white/80 font-medium">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PER-QUESTION BREAKDOWN TABLES (IMAGE 3) ────────────────────── */}
            {record.scenarioResults && record.scenarioResults.length > 0 && (
                <div className="space-y-6">
                    {record.scenarioResults.map((result, idx) => {
                        const roundQuestions = result.questions || [];
                        const qMetrics = result.questionsMetrics || {};
                        return (
                            <div key={idx} className="glass-card p-6 overflow-x-auto space-y-3">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        📋 Round {result.scenarioNumber}: {result.scenarioTitle || `Scenario ${result.scenarioNumber}`}
                                    </h2>
                                </div>
                                {roundQuestions.length > 0 ? (
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
                                            {roundQuestions.map(q => {
                                                const m = qMetrics[q.id] || {};
                                                return (
                                                    <tr key={q.id} className="border-t border-white/10 hover:bg-white/5">
                                                        <td className="p-2 font-medium">Q{q.id}</td>
                                                        <td className="p-2">
                                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">{q.phaseName || q.phase}</span>
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
                                ) : (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-sm">
                                        <span className="text-white/60">Level {result.difficultyLevel} • {result.decisionStyle}</span>
                                        <div className="flex items-center gap-4">
                                            <span>Perf: <strong>{Math.round(result.performanceScore * 100)}%</strong></span>
                                            <span>Acc: <strong>{Math.round(result.accuracyScore * 100)}%</strong></span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── PERSONALIZED RECOMMENDATIONS (IMAGE 4) ────────────────────── */}
            {primary && (
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-lg font-semibold uppercase tracking-wide text-white/80">
                            Personalized Recommendations
                        </h2>
                        <span className="text-xs text-white/40">🎯 {primary.focusArea}</span>
                    </div>

                    {/* YouTube row */}
                    <div className="grid md:grid-cols-2 gap-3">
                        {primary.youtubeTopics.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="w-16 h-11 rounded-lg bg-gradient-to-br from-red-500/40 to-rose-600/40 flex items-center justify-center text-lg shrink-0">
                                    ▶
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium leading-snug">{t}</p>
                                    <p className="text-xs text-white/40 flex items-center gap-1">📺 YouTube</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI sessions row */}
                    <div className="grid md:grid-cols-2 gap-3">
                        {primary.aiSessionTopics.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary-500/40 to-accent-500/40 flex items-center justify-center text-lg shrink-0">
                                    🤖
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium leading-snug">AI Session: {t}</p>
                                    <p className="text-xs text-white/40">Interact with our AI tutor to refine your skills.</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Insights (if available) */}
            {record.cognitive?.insights && record.cognitive.insights.length > 0 && (
                <div className="glass-card p-5 space-y-2">
                    <p className="text-xs uppercase tracking-widest text-white/40">AI Insights</p>
                    {record.cognitive.insights.map((insight, i) => (
                        <p key={i} className="text-sm text-white/60 flex items-start gap-2">
                            <span className="text-primary-400 mt-0.5">→</span>
                            {insight}
                        </p>
                    ))}
                </div>
            )}
        </section>
    );
}
