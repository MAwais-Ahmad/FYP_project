import { useState, useEffect } from 'react';
import { Question, Scenario, OverallMetrics, CognitiveFeatures, Answers } from '../../types/quiz.types';
import { analyzeReflection } from '../../services/api';

interface ResultsScreenProps {
    scenario: Scenario;
    questions: Question[];
    answers: Answers;
    calculateMetrics: () => OverallMetrics;
    questionsMetrics: Record<number, { totalTimeSpent: number; timeToFirstInteraction: number | null; answerChanges: number; responseLength: number }>;
    tokensUsed: number;
    totalCost: number;
    onAddCost: (tokens: number, cost: number) => void;
    onRestart: () => void;
}

export function ResultsScreen({
    scenario, questions, answers, calculateMetrics, questionsMetrics,
    tokensUsed, totalCost, onAddCost, onRestart
}: ResultsScreenProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [cognitiveFeatures, setCognitiveFeatures] = useState<CognitiveFeatures>({
        reflection_depth: 0.5,
        self_awareness: 0.5,
        learning_orientation: 0.5,
        creativity_score: 0.5,
        insights: ['Analysis pending'],
    });

    const overall = calculateMetrics();

    // Get reflection data from last question
    const lastQuestion = questions[questions.length - 1];
    const reflectionAnswer = answers[lastQuestion?.id] as string || '';
    const [confidenceStr, improvementText] = reflectionAnswer.split('|');
    const confidence = parseInt(confidenceStr) || 5;

    useEffect(() => {
        const analyze = async () => {
            try {
                const response = await analyzeReflection(
                    improvementText || '',
                    confidence,
                    scenario?.title || 'Decision-making exercise'
                );

                if (response.success && response.analysis) {
                    setCognitiveFeatures(response.analysis);
                    if (response.usage) {
                        onAddCost(response.usage.tokens, response.usage.estimatedCost);
                    }
                }
            } catch (error) {
                console.error('Reflection analysis failed:', error);
            } finally {
                setIsAnalyzing(false);
            }
        };

        analyze();
    }, []);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const generateInsights = () => {
        const insights: { icon: string; title: string; desc: string }[] = [];

        if (overall.avgTimeToStart < 3) {
            insights.push({ icon: '⚡', title: 'Quick Starter', desc: 'You begin answering quickly, showing confidence.' });
        } else if (overall.avgTimeToStart > 8) {
            insights.push({ icon: '🤔', title: 'Thoughtful', desc: 'You take time to read and think before responding.' });
        }

        if (overall.decisionStyle === 'impulsive') {
            insights.push({ icon: '🏃', title: 'Fast Decision Maker', desc: 'You make quick decisions under pressure.' });
        } else if (overall.decisionStyle === 'deliberate') {
            insights.push({ icon: '🧘', title: 'Careful Analyzer', desc: 'You prefer to thoroughly consider options.' });
        }

        if (cognitiveFeatures.reflection_depth > 0.7) {
            insights.push({ icon: '🔍', title: 'Deep Thinker', desc: 'Your reflections show thorough self-examination.' });
        }
        if (cognitiveFeatures.learning_orientation > 0.7) {
            insights.push({ icon: '📈', title: 'Growth Mindset', desc: 'You focus on improvement and learning.' });
        }
        if (cognitiveFeatures.creativity_score > 0.7) {
            insights.push({ icon: '💡', title: 'Creative Thinker', desc: 'You consider unconventional approaches.' });
        }

        if (cognitiveFeatures.insights && cognitiveFeatures.insights.length > 0) {
            cognitiveFeatures.insights.slice(0, 2).forEach(insight => {
                insights.push({ icon: '🎯', title: 'AI Observation', desc: insight });
            });
        }

        if (insights.length === 0) {
            insights.push({ icon: '✨', title: 'Balanced Approach', desc: 'Your patterns show a balanced problem-solving style.' });
        }

        return insights;
    };

    if (isAnalyzing) {
        return (
            <section className="min-h-screen flex items-center justify-center p-6">
                <div className="glass-card p-12 text-center space-y-6 max-w-md">
                    <div className="text-6xl animate-spin">🔄</div>
                    <h1 className="text-2xl font-bold">Analyzing Your Responses...</h1>
                    <p className="text-white/70">Please wait while AI analyzes your reflection</p>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-4 py-8">
                <div className="text-6xl">✅</div>
                <h1 className="text-3xl md:text-4xl font-bold">Assessment Complete!</h1>
                <p className="text-white/70">Behavioral metrics extracted for ML model analysis</p>
            </div>

            {/* Overall Stats */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    📊 Overall Performance
                </h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-xl bg-white/5">
                        <div className="text-2xl font-bold text-primary-400">{overall.avgResponseTime.toFixed(1)}s</div>
                        <div className="text-sm text-white/60">Avg per Question</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                        <div className="text-2xl font-bold text-accent-400">{confidence}/10</div>
                        <div className="text-sm text-white/60">Confidence</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                        <div className="text-2xl font-bold text-emerald-400 capitalize">{overall.decisionStyle}</div>
                        <div className="text-sm text-white/60">Decision Style</div>
                    </div>
                </div>
            </div>

            {/* Per-Question Metrics */}
            <div className="glass-card p-6 overflow-x-auto">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    📋 Per-Question Metrics
                </h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-white/60 text-left">
                            <th className="p-2">Question</th>
                            <th className="p-2">Phase</th>
                            <th className="p-2">Time Spent</th>
                            <th className="p-2">Time to Start</th>
                            <th className="p-2">Changes</th>
                            <th className="p-2">Response</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.map(q => {
                            const m = questionsMetrics[q.id] || {};
                            return (
                                <tr key={q.id} className="border-t border-white/10">
                                    <td className="p-2">Q{q.id}</td>
                                    <td className="p-2">
                                        <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                                            Phase {q.phase}
                                        </span>
                                    </td>
                                    <td className="p-2">{m.totalTimeSpent ? formatDuration(m.totalTimeSpent) : '--'}</td>
                                    <td className="p-2">{m.timeToFirstInteraction ? `${m.timeToFirstInteraction.toFixed(1)}s` : '--'}</td>
                                    <td className="p-2">{m.answerChanges || 0}</td>
                                    <td className="p-2">{m.responseLength ? `${m.responseLength} chars` : '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ML Features */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    🧠 ML Feature Vector
                </h2>
                <p className="text-white/60 text-sm mb-4">These features are ready for ML model training</p>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Timing Features */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-primary-300">⏱️ Timing Features</h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>avg_decision_time</span><span className="text-white/60">{overall.avgResponseTime.toFixed(1)}s</span></div>
                            <div className="flex justify-between"><span>time_variance</span><span className="text-white/60">{overall.timeVariance}</span></div>
                            <div className="flex justify-between"><span>time_trend</span><span className="text-white/60">{overall.timeTrend}</span></div>
                            <div className="flex justify-between"><span>rushed_decisions</span><span className="text-white/60">{overall.rushedDecisions}</span></div>
                            <div className="flex justify-between"><span>overthinking_count</span><span className="text-white/60">{overall.overthinkingCount}</span></div>
                        </div>
                    </div>

                    {/* Behavioral Features */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-accent-300">🔄 Behavioral Features</h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>answer_changes</span><span className="text-white/60">{overall.totalAnswerChanges}</span></div>
                            <div className="flex justify-between"><span>backtrack_count</span><span className="text-white/60">{overall.backtrackCount}</span></div>
                            <div className="flex justify-between"><span>confidence_avg</span><span className="text-white/60">{confidence}/10</span></div>
                            <div className="flex justify-between"><span>decision_style</span><span className="text-white/60">{overall.decisionStyle}</span></div>
                        </div>
                    </div>

                    {/* Cognitive Features */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-emerald-300">🤖 Cognitive Features (GPT)</h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>reflection_depth</span><span className="text-white/60">{(cognitiveFeatures.reflection_depth * 100).toFixed(0)}%</span></div>
                            <div className="flex justify-between"><span>self_awareness</span><span className="text-white/60">{(cognitiveFeatures.self_awareness * 100).toFixed(0)}%</span></div>
                            <div className="flex justify-between"><span>learning_orientation</span><span className="text-white/60">{(cognitiveFeatures.learning_orientation * 100).toFixed(0)}%</span></div>
                            <div className="flex justify-between"><span>creativity_score</span><span className="text-white/60">{(cognitiveFeatures.creativity_score * 100).toFixed(0)}%</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    💡 AI-Powered Insights
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {generateInsights().map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                            <span className="text-2xl">{insight.icon}</span>
                            <div>
                                <strong className="block">{insight.title}</strong>
                                <p className="text-sm text-white/70">{insight.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cost */}
            <div className="glass-card p-4 text-center">
                <p className="text-white/70">
                    💰 Total session cost: <strong className="text-white">~${(totalCost).toFixed(4)}</strong> ({tokensUsed} tokens)
                </p>
            </div>

            {/* Restart Button */}
            <div className="flex justify-center pb-8">
                <button onClick={onRestart} className="btn-primary text-lg py-4 px-8">
                    <span>Start New Assessment</span>
                </button>
            </div>
        </section>
    );
}
