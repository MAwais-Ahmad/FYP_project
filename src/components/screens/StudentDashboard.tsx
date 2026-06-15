import { LEARNER_CATEGORIES } from '../../utils/classifyLearner';
import { getRecordsByName } from '../../utils/storage';

interface StudentDashboardProps {
    studentName: string;
    onBack: () => void;
    onStartNew: () => void;
}

function fmtDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export function StudentDashboard({ studentName, onBack, onStartNew }: StudentDashboardProps) {
    // Newest first
    const records = getRecordsByName(studentName).sort((a, b) => b.date.localeCompare(a.date));
    const latest = records[0] ?? null;
    const primary = latest ? LEARNER_CATEGORIES[latest.primaryCategory] : null;

    // Attempts in chronological order for the curve
    const chrono = [...records].reverse();

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn-secondary !py-2 !px-3 text-sm">← Home</button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">{studentName || 'My'} Dashboard</h1>
                        <p className="text-white/50 text-sm">
                            {records.length} assessment{records.length !== 1 ? 's' : ''} taken
                        </p>
                    </div>
                </div>
                <button onClick={onStartNew} className="btn-primary !py-2 !px-5 text-sm">+ New Assessment</button>
            </div>

            {records.length === 0 ? (
                <div className="glass-card p-10 text-center space-y-3">
                    <div className="text-5xl">📭</div>
                    <h2 className="text-xl font-semibold">No assessments yet</h2>
                    <p className="text-white/50">Take your first assessment to start building your learner profile.</p>
                    <div className="flex justify-center pt-2">
                        <button onClick={onStartNew} className="btn-primary">Start Assessment</button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Latest profile summary */}
                    {latest && primary && (
                        <div className="glass-card p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${primary.color} flex items-center justify-center text-4xl shrink-0`}>
                                {primary.emoji}
                            </div>
                            <div className="flex-1 space-y-2 text-center sm:text-left">
                                <div className="text-xs uppercase tracking-widest text-white/40">Current Learner Profile</div>
                                <h2 className="text-2xl font-bold">{primary.name}</h2>
                                <p className="text-white/60 text-sm">{primary.description}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <div className="text-2xl font-bold">{Math.round(latest.performanceScore * 100)}%</div>
                                    <div className="text-xs text-white/40">Performance</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{latest.confidence}/10</div>
                                    <div className="text-xs text-white/40">Confidence</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{Math.round(latest.accuracyScore * 100)}%</div>
                                    <div className="text-xs text-white/40">Accuracy</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Performance across attempts */}
                    {chrono.length > 0 && (
                        <div className="glass-card p-6 space-y-4">
                            <h2 className="text-lg font-semibold">📈 Performance Across Attempts</h2>
                            <div className="flex items-end gap-3 h-40">
                                {chrono.map((r, i) => {
                                    const pct = Math.round(r.performanceScore * 100);
                                    return (
                                        <div key={r.id} className="flex-1 flex flex-col items-center gap-2">
                                            <div className="text-xs font-bold">{pct}%</div>
                                            <div className="relative w-full flex-1 bg-white/5 rounded-lg overflow-hidden flex items-end">
                                                <div
                                                    className="w-full bg-gradient-to-t from-primary-500 to-accent-500"
                                                    style={{ height: `${Math.max(pct, 5)}%` }}
                                                />
                                            </div>
                                            <div className="text-[10px] text-white/40">#{i + 1}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {primary && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="glass-card p-5 space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">📺 Recommended Topics</h3>
                                <ul className="space-y-2">
                                    {primary.youtubeTopics.map((t, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                            <span className="text-red-400 mt-0.5">▶</span>{t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="glass-card p-5 space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">🤖 AI Practice Sessions</h3>
                                <ul className="space-y-2">
                                    {primary.aiSessionTopics.map((t, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                            <span className="text-primary-400 mt-0.5">→</span>{t}
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

                    {/* History table */}
                    <div className="glass-card p-6 overflow-x-auto space-y-3">
                        <h2 className="text-lg font-semibold">🗓️ Assessment History</h2>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-white/50 text-left">
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Category</th>
                                    <th className="p-2">Rounds</th>
                                    <th className="p-2">Performance</th>
                                    <th className="p-2">Confidence</th>
                                    <th className="p-2">Style</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                                        <td className="p-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                                        <td className="p-2">{r.primaryEmoji} {r.primaryName}</td>
                                        <td className="p-2">{r.scenariosCompleted}</td>
                                        <td className="p-2">{Math.round(r.performanceScore * 100)}%</td>
                                        <td className="p-2">{r.confidence}/10</td>
                                        <td className="p-2 capitalize">{r.decisionStyle}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
