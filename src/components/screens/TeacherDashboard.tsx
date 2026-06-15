import { useState } from 'react';
import { LearnerCategoryId } from '../../types/quiz.types';
import { LEARNER_CATEGORIES } from '../../utils/classifyLearner';
import { clearRecords, getRecords, StudentRecord } from '../../utils/storage';

interface TeacherDashboardProps {
    onBack: () => void;
}

function fmtDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}

const CATEGORY_IDS = Object.keys(LEARNER_CATEGORIES) as LearnerCategoryId[];

export function TeacherDashboard({ onBack }: TeacherDashboardProps) {
    const [records, setRecords] = useState<StudentRecord[]>(() =>
        getRecords().sort((a, b) => b.date.localeCompare(a.date))
    );
    const [selected, setSelected] = useState<StudentRecord | null>(null);

    const uniqueStudents = new Set(records.map(r => r.name.trim().toLowerCase())).size;
    const avg = (fn: (r: StudentRecord) => number) =>
        records.length ? records.reduce((s, r) => s + fn(r), 0) / records.length : 0;

    const avgPerformance = avg(r => r.performanceScore);
    const avgConfidence = avg(r => r.confidence);
    const avgAccuracy = avg(r => r.accuracyScore);

    // Category distribution (primary)
    const distribution = CATEGORY_IDS.map(id => ({
        id,
        meta: LEARNER_CATEGORIES[id],
        count: records.filter(r => r.primaryCategory === id).length,
    }));
    const maxCount = Math.max(1, ...distribution.map(d => d.count));

    const handleClear = () => {
        if (confirm('Clear ALL stored assessment records? This cannot be undone.')) {
            clearRecords();
            setRecords([]);
            setSelected(null);
        }
    };

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn-secondary !py-2 !px-3 text-sm">← Home</button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">👨‍🏫 Teacher Dashboard</h1>
                        <p className="text-white/50 text-sm">
                            {uniqueStudents} student{uniqueStudents !== 1 ? 's' : ''} · {records.length} assessment{records.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                {records.length > 0 && (
                    <button onClick={handleClear} className="btn-secondary !py-2 !px-4 text-sm !border-rose-400/30 text-rose-300">
                        🗑️ Clear Data
                    </button>
                )}
            </div>

            {records.length === 0 ? (
                <div className="glass-card p-10 text-center space-y-3">
                    <div className="text-5xl">📊</div>
                    <h2 className="text-xl font-semibold">No class data yet</h2>
                    <p className="text-white/50">
                        Completed assessments on this device will appear here for class-wide analysis.
                    </p>
                </div>
            ) : (
                <>
                    {/* Class stat cards */}
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="glass-card p-5 text-center">
                            <div className="text-3xl font-bold">{Math.round(avgPerformance * 100)}%</div>
                            <div className="text-sm text-white/50">Avg Performance</div>
                        </div>
                        <div className="glass-card p-5 text-center">
                            <div className="text-3xl font-bold">{avgConfidence.toFixed(1)}/10</div>
                            <div className="text-sm text-white/50">Avg Confidence</div>
                        </div>
                        <div className="glass-card p-5 text-center">
                            <div className="text-3xl font-bold">{Math.round(avgAccuracy * 100)}%</div>
                            <div className="text-sm text-white/50">Avg Accuracy</div>
                        </div>
                    </div>

                    {/* Category distribution */}
                    <div className="glass-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold">🧩 Learner Category Distribution</h2>
                        <div className="space-y-2">
                            {distribution.map(d => (
                                <div key={d.id} className="flex items-center gap-3">
                                    <div className="w-44 shrink-0 text-sm truncate">
                                        {d.meta.emoji} {d.meta.name}
                                    </div>
                                    <div className="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${d.meta.color} transition-all duration-500`}
                                            style={{ width: `${(d.count / maxCount) * 100}%` }}
                                        />
                                    </div>
                                    <div className="w-8 text-right text-sm font-medium">{d.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Student registry */}
                    <div className="glass-card p-6 overflow-x-auto space-y-3">
                        <h2 className="text-lg font-semibold">👥 Student Registry</h2>
                        <p className="text-white/40 text-xs">Click a row to view detailed metrics and AI feedback.</p>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-white/50 text-left">
                                    <th className="p-2">Student</th>
                                    <th className="p-2">Primary</th>
                                    <th className="p-2">Secondary</th>
                                    <th className="p-2">Conf.</th>
                                    <th className="p-2">Perf.</th>
                                    <th className="p-2">Rounds</th>
                                    <th className="p-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr
                                        key={r.id}
                                        onClick={() => setSelected(r)}
                                        className="border-t border-white/10 hover:bg-white/10 cursor-pointer"
                                    >
                                        <td className="p-2 font-medium">{r.name}</td>
                                        <td className="p-2">{r.primaryEmoji} {r.primaryName}</td>
                                        <td className="p-2 text-white/50">{r.secondaryName ?? '–'}</td>
                                        <td className="p-2">{r.confidence}/10</td>
                                        <td className="p-2">{Math.round(r.performanceScore * 100)}%</td>
                                        <td className="p-2">{r.scenariosCompleted}</td>
                                        <td className="p-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Drill-down modal */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold">{selected.name}</h2>
                                <p className="text-white/50 text-sm">{fmtDate(selected.date)} · {selected.primaryEmoji} {selected.primaryName}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="btn-secondary !py-1.5 !px-3 text-sm">✕</button>
                        </div>

                        {/* Headline metrics */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                            {[
                                ['Perf.', `${Math.round(selected.performanceScore * 100)}%`],
                                ['Conf.', `${selected.confidence}/10`],
                                ['Accuracy', `${Math.round(selected.accuracyScore * 100)}%`],
                                ['Avg time', `${selected.avgResponseTime.toFixed(0)}s`],
                            ].map(([k, v]) => (
                                <div key={k} className="p-2 rounded-lg bg-white/5">
                                    <div className="text-lg font-bold">{v}</div>
                                    <div className="text-[10px] text-white/40">{k}</div>
                                </div>
                            ))}
                        </div>

                        {/* Cognitive features */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-white/70">Cognitive Features</h3>
                            {[
                                ['Reflection depth', selected.cognitive.reflection_depth],
                                ['Self-awareness', selected.cognitive.self_awareness],
                                ['Learning orientation', selected.cognitive.learning_orientation],
                                ['Creativity', selected.cognitive.creativity_score],
                            ].map(([k, v]) => (
                                <div key={k as string} className="flex items-center gap-3">
                                    <div className="w-40 text-xs text-white/50">{k}</div>
                                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500" style={{ width: `${(v as number) * 100}%` }} />
                                    </div>
                                    <div className="w-10 text-right text-xs">{Math.round((v as number) * 100)}%</div>
                                </div>
                            ))}
                        </div>

                        {/* Per-round breakdown */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-white/70">Per-Round Breakdown</h3>
                            <div className="space-y-2">
                                {selected.scenarioResults.map(s => (
                                    <div key={s.scenarioNumber} className="p-3 rounded-lg bg-white/5 text-sm">
                                        <div className="flex justify-between gap-2">
                                            <span className="font-medium truncate">R{s.scenarioNumber}: {s.scenarioTitle}</span>
                                            <span className="text-white/60 shrink-0">{Math.round(s.performanceScore * 100)}% · Lvl {s.difficultyLevel}</span>
                                        </div>
                                        {s.cognitive.insights?.length > 0 && (
                                            <ul className="mt-1 space-y-0.5 text-xs text-white/50">
                                                {s.cognitive.insights.map((ins, i) => (
                                                    <li key={i}>• {ins}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
