import { useState, useEffect, useRef } from 'react';
import {
    CategoryResult,
    OverallMetrics,
    Question,
    ScenarioResult,
} from '../../types/quiz.types';
import { classifyLearner, LEARNER_CATEGORIES } from '../../utils/classifyLearner';
import { addRecord, buildRecord } from '../../utils/storage';

interface ResultsScreenProps {
    questions: Question[];
    calculateMetrics: () => OverallMetrics;
    questionsMetrics: Record<
        number,
        { totalTimeSpent: number; timeToFirstInteraction: number | null; answerChanges: number; responseLength: number }
    >;
    scenarioResults: ScenarioResult[];
    studentName: string;
    tokensUsed: number;
    totalCost: number;
    onRestart: () => void;
    onViewDashboard?: () => void;
}

// ─── COGNITIVE PROFILE RADAR ───────────────────────────────────────────────────

function RadarChart({ axes }: { axes: { label: string; value: number }[] }) {
    const size = 230;
    const c = size / 2;
    const r = 78;
    const n = axes.length;
    const angleFor = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
    const pt = (i: number, radius: number) => ({
        x: c + radius * Math.cos(angleFor(i)),
        y: c + radius * Math.sin(angleFor(i)),
    });

    const valuePoints = axes
        .map((a, i) => {
            const p = pt(i, r * Math.max(0.05, Math.min(1, a.value)));
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(' ');

    const rings = [0.25, 0.5, 0.75, 1];

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto">
            {/* grid rings */}
            {rings.map((ring, ri) => (
                <polygon
                    key={ri}
                    points={axes
                        .map((_, i) => {
                            const p = pt(i, r * ring);
                            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                        })
                        .join(' ')}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                />
            ))}
            {/* axes */}
            {axes.map((_, i) => {
                const p = pt(i, r);
                return <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
            })}
            {/* value polygon */}
            <polygon points={valuePoints} fill="rgba(139,92,246,0.35)" stroke="rgb(167,139,250)" strokeWidth="2" />
            {/* labels */}
            {axes.map((a, i) => {
                const p = pt(i, r + 16);
                return (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        fontSize="9"
                        fill="rgba(255,255,255,0.6)"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {a.label}
                    </text>
                );
            })}
        </svg>
    );
}

// ─── LEARNING CURVE ─────────────────────────────────────────────────────────────

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
                            <div className="text-xs text-white/40">Lvl {r.difficultyLevel} · {r.decisionStyle}</div>
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

// ─── STAT CARD ──────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, sub }: { icon: string; value: string; label: string; sub: string }) {
    return (
        <div className="glass-card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-2xl font-bold leading-none">{value}</div>
                <div className="text-sm font-medium text-white/80 mt-1">{label}</div>
                <div className="text-xs text-white/40">{sub}</div>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function ResultsScreen({
    questions,
    calculateMetrics,
    questionsMetrics,
    scenarioResults,
    studentName,
    tokensUsed,
    totalCost,
    onRestart,
    onViewDashboard,
}: ResultsScreenProps) {
    const [categoryResult, setCategoryResult] = useState<CategoryResult | null>(null);
    const savedRef = useRef(false);

    const overall = calculateMetrics();
    const latest = scenarioResults[scenarioResults.length - 1] ?? null;
    const confidence = latest ? Math.round(latest.confidence) : 0;

    // Classify learner using data from the latest scenario result, then persist
    // the assessment to localStorage exactly once (feeds the dashboards).
    useEffect(() => {
        if (latest) {
            const result = classifyLearner({
                overall,
                cognitive: latest.cognitive,
                scenarioResults,
                confidence: latest.confidence,
                accuracyScore: latest.accuracyScore,
            });
            setCategoryResult(result);

            if (!savedRef.current) {
                savedRef.current = true;
                addRecord(buildRecord(studentName, result, scenarioResults, overall));
            }
        }
    }, [scenarioResults]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const primary = categoryResult ? LEARNER_CATEGORIES[categoryResult.primary_category] : null;
    const secondary =
        categoryResult?.category_blend && categoryResult.secondary_category
            ? LEARNER_CATEGORIES[categoryResult.secondary_category]
            : null;

    // Stat-card derived labels
    const speedSub = overall.avgResponseTime < 30 ? 'Quick & efficient' : overall.avgResponseTime <= 80 ? 'Balanced pace' : 'Deliberate & thorough';
    const changesSub = overall.totalAnswerChanges === 0 ? 'Decisive' : overall.totalAnswerChanges <= 4 ? 'Thoughtful reconsideration' : 'Frequent revisions';
    const backtrackSub = overall.backtrackCount === 0 ? 'No path deviation' : overall.backtrackCount <= 2 ? 'Minimal path deviation' : 'Explored back & forth';
    const confSub = confidence >= 8 ? 'High self-assurance' : confidence >= 5 ? 'Measured assurance' : confidence > 0 ? 'Tentative' : 'Disengaged';

    const radarAxes = latest
        ? [
              { label: 'Accuracy', value: latest.accuracyScore },
              { label: 'Reflection', value: latest.cognitive.reflection_depth },
              { label: 'Self-Aware', value: latest.cognitive.self_awareness },
              { label: 'Creativity', value: latest.cognitive.creativity_score },
              { label: 'Learning', value: latest.cognitive.learning_orientation },
              { label: 'Confidence', value: confidence / 10 },
          ]
        : [];

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-5xl mx-auto">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-3xl shadow-lg shrink-0">
                    ✓
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold">Assessment Complete!</h1>
                    <p className="text-white/60">
                        {scenarioResults.length} scenario{scenarioResults.length !== 1 ? 's' : ''} processed — here&apos;s your personalized breakdown.
                    </p>
                </div>
            </div>

            {/* ── LEARNER CATEGORY HERO ──────────────────────────────────────── */}
            {categoryResult && primary && (
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
                                    {Math.round(categoryResult.primary_confidence * 100)}% Confidence
                                </span>
                            </div>
                            <p className="text-white/70 leading-relaxed">{primary.description}</p>

                            {secondary && (
                                <div className="inline-flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                    <span className="text-2xl">{secondary.emoji}</span>
                                    <div className="text-sm leading-tight">
                                        <div className="text-white/40 text-xs uppercase tracking-wide">Secondary Category</div>
                                        <strong>{secondary.name}</strong>
                                        <span className="text-white/40 ml-2">
                                            ({Math.round((categoryResult.secondary_confidence ?? 0) * 100)}% match)
                                        </span>
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

            {/* ── STAT CARDS + COGNITIVE RADAR ───────────────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                    <StatCard icon="⏱️" value={`${overall.avgResponseTime.toFixed(0)}s`} label="Avg Decision Time" sub={speedSub} />
                    <StatCard icon="✏️" value={`${overall.totalAnswerChanges}`} label="Answer Changes" sub={changesSub} />
                    <StatCard icon="↩️" value={`${overall.backtrackCount}`} label="Backtracks" sub={backtrackSub} />
                    <StatCard icon="📊" value={`${confidence}/10`} label="Confidence" sub={confSub} />
                </div>

                {/* Cognitive profile radar */}
                <div className="glass-card p-5 space-y-2">
                    <h3 className="font-semibold text-sm">🧭 Cognitive Profile</h3>
                    {latest ? (
                        <RadarChart axes={radarAxes} />
                    ) : (
                        <p className="text-white/40 text-sm">No data available.</p>
                    )}
                </div>
            </div>

            {/* ── PERSONALIZED RECOMMENDATIONS ───────────────────────────────── */}
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

            {/* ── LEARNING CURVE ──────────────────────────────────────────────── */}
            <ScenarioProgressCard results={scenarioResults} />

            {/* ── ML FEATURE VECTOR ───────────────────────────────────────────── */}
            <div className="glass-card p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">📊 ML Feature Vector</h2>
                    <p className="text-white/50 text-xs mt-1">These raw features feed the Random Forest classifier</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                    {/* Timing */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-primary-300 text-xs uppercase tracking-wide">⏱️ Timing Features</h3>
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
                        <h3 className="font-medium text-accent-300 text-xs uppercase tracking-wide">🔄 Behavioral Features</h3>
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
                        <h3 className="font-medium text-emerald-300 text-xs uppercase tracking-wide">🤖 Cognitive Features</h3>
                        <div className="space-y-1">
                            {latest &&
                                [
                                    ['accuracy_score', `${(latest.accuracyScore * 100).toFixed(0)}%`],
                                    ['reflection_depth', `${(latest.cognitive.reflection_depth * 100).toFixed(0)}%`],
                                    ['self_awareness', `${(latest.cognitive.self_awareness * 100).toFixed(0)}%`],
                                    ['learning_orient.', `${(latest.cognitive.learning_orientation * 100).toFixed(0)}%`],
                                    ['creativity_score', `${(latest.cognitive.creativity_score * 100).toFixed(0)}%`],
                                    ['primary_category', categoryResult?.primary_emoji ?? '–'],
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
                            const m = questionsMetrics[q.id] || ({} as (typeof questionsMetrics)[number]);
                            return (
                                <tr key={q.id} className="border-t border-white/10 hover:bg-white/5">
                                    <td className="p-2 font-medium">Q{q.id}</td>
                                    <td className="p-2">
                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">{q.phaseName}</span>
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
                    💰 Session cost: <strong className="text-white">~${totalCost.toFixed(4)}</strong> ({tokensUsed} tokens)
                </p>
                <p className="text-white/30 text-xs">gpt-4o-mini — scenario generation + reflection analysis</p>
            </div>

            <div className="flex justify-center gap-4 flex-wrap">
                {onViewDashboard && (
                    <button onClick={onViewDashboard} className="btn-secondary text-lg py-4 px-8">
                        <span>📊 View Dashboard</span>
                    </button>
                )}
                <button onClick={onRestart} className="btn-primary text-lg py-4 px-10">
                    <span>Take Another Quiz</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6M23 20v-6h-6" />
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                </button>
            </div>
        </section>
    );
}
