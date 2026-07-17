import { StudentRecord } from '../../utils/storage';
import { LEARNER_CATEGORIES } from '../../utils/classifyLearner';

interface RecordDetailProps {
    record: StudentRecord;
    onBack: () => void;
}

export function RecordDetail({ record, onBack }: RecordDetailProps) {
    const category = LEARNER_CATEGORIES[record.primaryCategory];
    const secondary = record.secondaryCategory
        ? LEARNER_CATEGORIES[record.secondaryCategory]
        : null;

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="btn-secondary !py-2 !px-3 text-sm">
                    ← Back
                </button>
                <div>
                    <h1 className="text-2xl font-bold">{record.name}</h1>
                    <p className="text-white/40 text-sm">
                        {new Date(record.date).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>
            </div>

            {/* Primary Category */}
            {category && (
                <div className="glass-card p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                    <div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-4xl shrink-0`}
                    >
                        {category.emoji}
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="text-xs uppercase tracking-widest text-white/40">
                            Learner Profile
                        </div>
                        <h2 className="text-2xl font-bold">{category.name}</h2>
                        <p className="text-white/60 text-sm">{category.description}</p>
                        {secondary && (
                            <p className="text-white/40 text-xs">
                                Secondary: {secondary.emoji} {secondary.name}
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <div className="text-2xl font-bold">
                                {Math.round(record.performanceScore * 100)}%
                            </div>
                            <div className="text-xs text-white/40">Performance</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{record.confidence}/10</div>
                            <div className="text-xs text-white/40">Confidence</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {Math.round(record.accuracyScore * 100)}%
                            </div>
                            <div className="text-xs text-white/40">Accuracy</div>
                        </div>
                    </div>
                </div>
            )}

            {/* VARK */}
            {record.vark && (
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        🎧 Sensory Learning Preference (VARK)
                    </h2>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            {
                                label: '🎥 Visual',
                                value: record.vark.visual || 0,
                                color: 'bg-indigo-500',
                            },
                            {
                                label: '🎧 Auditory',
                                value: record.vark.auditory || 0,
                                color: 'bg-cyan-500',
                            },
                            {
                                label: '📝 Read/Write',
                                value: record.vark.readWrite || 0,
                                color: 'bg-emerald-500',
                            },
                            {
                                label: '🛠️ Kinesthetic',
                                value: record.vark.kinesthetic || 0,
                                color: 'bg-amber-500',
                            },
                        ].map((v) => (
                            <div key={v.label} className="space-y-1">
                                <div className="flex justify-between text-xs text-white/60">
                                    <span>{v.label}</span>
                                    <span>{Math.round(v.value * 100)}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${v.color} transition-all duration-500`}
                                        style={{ width: `${v.value * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cognitive Scores */}
            {record.cognitive && (
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-lg font-semibold">🧠 Cognitive Profile</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {[
                            { label: 'Reflection Depth', value: record.cognitive.reflection_depth },
                            { label: 'Self-Awareness', value: record.cognitive.self_awareness },
                            {
                                label: 'Learning Orientation',
                                value: record.cognitive.learning_orientation,
                            },
                            { label: 'Creativity', value: record.cognitive.creativity_score },
                        ].map((item) => (
                            <div key={item.label} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/70">{item.label}</span>
                                    <span className="font-semibold">
                                        {(item.value * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                                        style={{ width: `${item.value * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    {record.cognitive.insights && record.cognitive.insights.length > 0 && (
                        <div className="mt-3 space-y-1">
                            <p className="text-xs uppercase tracking-widest text-white/40">
                                AI Insights
                            </p>
                            {record.cognitive.insights.map((insight, i) => (
                                <p key={i} className="text-sm text-white/60 flex items-start gap-2">
                                    <span className="text-primary-400 mt-0.5">→</span>
                                    {insight}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Behavioral Metrics */}
            <div className="glass-card p-6 space-y-4">
                <h2 className="text-lg font-semibold">📊 Behavioral Metrics</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Avg Response Time',
                            value: `${record.avgResponseTime?.toFixed(1) || '—'}s`,
                        },
                        { label: 'Decision Style', value: record.decisionStyle },
                        {
                            label: 'Scenarios Completed',
                            value: record.scenariosCompleted.toString(),
                        },
                        {
                            label: 'Avg Performance',
                            value: `${Math.round(record.avgPerformanceScore * 100)}%`,
                        },
                    ].map((item) => (
                        <div key={item.label} className="text-center p-3 rounded-xl bg-white/5">
                            <div className="text-xl font-bold capitalize">{item.value}</div>
                            <div className="text-xs text-white/40 mt-1">{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scenario Results */}
            {record.scenarioResults && record.scenarioResults.length > 0 && (
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-lg font-semibold">🎭 Scenario Breakdown</h2>
                    <div className="space-y-3">
                        {record.scenarioResults.map((sr, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
                            >
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {sr.scenarioTitle || `Scenario ${sr.scenarioNumber}`}
                                    </div>
                                    <div className="text-xs text-white/40">
                                        Level {sr.difficultyLevel} • {sr.decisionStyle}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="text-center">
                                        <div className="font-bold">
                                            {Math.round(sr.performanceScore * 100)}%
                                        </div>
                                        <div className="text-[10px] text-white/40">Perf</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold">
                                            {Math.round(sr.accuracyScore * 100)}%
                                        </div>
                                        <div className="text-[10px] text-white/40">Acc</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {category && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass-card p-5 space-y-2">
                        <h3 className="font-semibold flex items-center gap-2">
                            📺 Recommended Topics
                        </h3>
                        <ul className="space-y-2">
                            {category.youtubeTopics.map((t: string, i: number) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-white/70"
                                >
                                    <span className="text-red-400 mt-0.5">▶</span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="glass-card p-5 space-y-2">
                        <h3 className="font-semibold flex items-center gap-2">
                            🤖 AI Practice Sessions
                        </h3>
                        <ul className="space-y-2">
                            {category.aiSessionTopics.map((t: string, i: number) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-white/70"
                                >
                                    <span className="text-primary-400 mt-0.5">→</span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                        <div className="pt-2 border-t border-white/10">
                            <p className="text-xs text-white/40">🎯 Focus area:</p>
                            <p className="text-sm font-medium text-white/80">
                                {category.focusArea}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
