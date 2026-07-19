import { CustomExamResults } from './CustomQuizScreen';
import { classifyLearner, LEARNER_CATEGORIES, heuristicCognitiveFeatures, calculateDynamicConfidence } from '../../utils/classifyLearner';
import { OverallMetrics } from '../../types/quiz.types';

interface CustomResultsScreenProps {
    results: CustomExamResults;
    onRestart: () => void;
    onViewDashboard?: () => void;
}

export function CustomResultsScreen({ results, onRestart, onViewDashboard }: CustomResultsScreenProps) {
    const { examTitle, totalMarks, obtainedMarks, percentage, totalTime, avgTimePerQuestion, questions, selectedAnswers, questionTimes, revisionCounts, totalRevisions } = results;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const skippedCount = questions.length - Object.keys(selectedAnswers).length;
    const accuracyScore = obtainedMarks / Math.max(1, totalMarks);

    // Compute dynamic item-level timing metrics from questionTimes
    const times = Object.values(questionTimes);
    const validTimes = times.filter(t => t > 0);
    const meanTime = validTimes.length > 0 ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : avgTimePerQuestion;

    // Coefficient of variation (stdDev / mean) for pacing consistency
    const varianceVal = validTimes.length > 1
        ? Math.sqrt(validTimes.reduce((sum, t) => sum + Math.pow(t - meanTime, 2), 0) / validTimes.length) / (meanTime || 1)
        : 0.25;

    const rushedCount = validTimes.filter(t => t < 15).length;
    const overthinkingVal = validTimes.filter(t => t > 60).length;
    const overtimeVal = validTimes.filter(t => t > 90).length;

    // Pacing trend (speeding up vs slowing down)
    let timeTrendVal: 'speeding_up' | 'slowing_down' | 'stable' = 'stable';
    if (validTimes.length >= 4) {
        const firstHalf = validTimes.slice(0, Math.floor(validTimes.length / 2));
        const secondHalf = validTimes.slice(Math.floor(validTimes.length / 2));
        const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (avg2 < avg1 * 0.8) timeTrendVal = 'speeding_up';
        else if (avg2 > avg1 * 1.2) timeTrendVal = 'slowing_down';
    }

    // Build complete multi-dimensional overall metrics
    const overallMetrics: OverallMetrics = {
        totalTime,
        avgResponseTime: meanTime,
        avgTimeToStart: 2.5,
        timeVariance: varianceVal.toFixed(2),
        rushedDecisions: rushedCount,
        overthinkingCount: overthinkingVal,
        totalAnswerChanges: totalRevisions,
        backtrackCount: 0,
        questionsAnswered: Object.keys(selectedAnswers).length,
        totalResponseLength: 0,
        skippedQuestions: skippedCount,
        overtimeCount: overtimeVal,
        timeTrend: timeTrendVal,
        decisionStyle: meanTime < 25 ? 'impulsive' : meanTime > 60 ? 'deliberate' : 'balanced',
    };

    const cognitive = heuristicCognitiveFeatures(selectedAnswers as any, [], overallMetrics);
    const confidence = calculateDynamicConfidence(overallMetrics, accuracyScore, '');

    // Full multi-dimensional classification engine call
    const categoryResult = classifyLearner({
        overall: overallMetrics,
        cognitive,
        scenarioResults: [],
        confidence,
        accuracyScore,
    });

    const primaryProfile = LEARNER_CATEGORIES[categoryResult.primary_category];

    const cognitiveInsight = categoryResult.primary_name;
    const insightEmoji = categoryResult.primary_emoji;

    const scoreColor = percentage >= 70 ? 'text-green-400' : percentage >= 50 ? 'text-yellow-400' : 'text-red-400';
    const scoreBg = percentage >= 70 ? 'from-green-500/20 to-green-500/5' : percentage >= 50 ? 'from-yellow-500/20 to-yellow-500/5' : 'from-red-500/20 to-red-500/5';

    return (
        <section className="min-h-screen p-4 md:p-6 relative overflow-hidden pb-20">
            <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
            <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        📋 Exam Results
                    </h1>
                    <p className="text-white/50">{examTitle}</p>
                </div>

                {/* Score & Cognitive Profile Card */}
                <div className={`glass-card p-6 bg-gradient-to-br ${scoreBg} border border-white/10 space-y-4`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-white/50 uppercase tracking-wider">Your Exam Score</p>
                            <div className={`text-5xl font-black ${scoreColor}`}>
                                {obtainedMarks} / {totalMarks}
                            </div>
                            <div className={`text-2xl font-bold ${scoreColor}`}>
                                {percentage}%
                            </div>
                        </div>

                        <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 max-w-xs">
                            <div className="text-4xl mb-1">{insightEmoji}</div>
                            <p className="text-base font-bold text-primary-300">{cognitiveInsight}</p>
                            <p className="text-xs text-green-400 font-medium">
                                Math Confidence: {Math.round(categoryResult.primary_confidence * 100)}%
                            </p>
                            {categoryResult.secondary_name && (
                                <p className="text-[10px] text-white/40 mt-1">
                                    Blend: {categoryResult.secondary_emoji} {categoryResult.secondary_name} ({Math.round((categoryResult.secondary_confidence || 0) * 100)}%)
                                </p>
                            )}
                        </div>
                    </div>

                    {primaryProfile && (
                        <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                            <p className="text-white/80 leading-relaxed">{primaryProfile.description}</p>
                            <div className="flex items-center gap-2 text-accent-300 font-medium">
                                <span>🎯 Key Focus:</span>
                                <span>{primaryProfile.focusArea}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">{formatTime(totalTime)}</p>
                        <p className="text-xs text-white/40 mt-1">Total Time</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">{formatTime(avgTimePerQuestion)}</p>
                        <p className="text-xs text-white/40 mt-1">Avg per Question</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">{totalRevisions}</p>
                        <p className="text-xs text-white/40 mt-1">Answer Revisions</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">{skippedCount}</p>
                        <p className="text-xs text-white/40 mt-1">Skipped</p>
                    </div>
                </div>

                {/* Per-Question Review Table */}
                <div className="glass-card p-5 space-y-4">
                    <h2 className="text-lg font-bold">📝 Question-by-Question Review</h2>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {questions.map((q, i) => {
                            const selected = selectedAnswers[q.id];
                            const isCorrect = selected === q.correctAnswer;
                            const isSkipped = !selected;
                            const timeSpent = questionTimes[q.id] || 0;
                            const revisions = revisionCounts[q.id] || 0;

                            return (
                                <div
                                    key={q.id}
                                    className={`p-4 rounded-xl border space-y-3 ${
                                        isSkipped
                                            ? 'border-yellow-500/20 bg-yellow-500/5'
                                            : isCorrect
                                            ? 'border-green-500/20 bg-green-500/5'
                                            : 'border-red-500/20 bg-red-500/5'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 flex-1">
                                            <span className={`text-lg mt-0.5 ${isSkipped ? '' : isCorrect ? '' : ''}`}>
                                                {isSkipped ? '⏭️' : isCorrect ? '✅' : '❌'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                    <span className="text-white/40">Q{i + 1}.</span> {q.question}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`text-sm font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                                {isCorrect ? q.marks : 0}/{q.marks}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pl-7">
                                        {q.options.map((opt, oi) => {
                                            const optLetter = opt.charAt(0);
                                            const isSelectedOpt = selected === optLetter;
                                            const isCorrectOpt = q.correctAnswer === optLetter;

                                            let optClass = 'border-white/5 bg-white/5 text-white/50';
                                            if (isCorrectOpt) optClass = 'border-green-500/30 bg-green-500/10 text-green-300';
                                            if (isSelectedOpt && !isCorrectOpt) optClass = 'border-red-500/30 bg-red-500/10 text-red-300 line-through';

                                            return (
                                                <div
                                                    key={oi}
                                                    className={`text-xs p-2 rounded-lg border ${optClass}`}
                                                >
                                                    {opt}
                                                    {isCorrectOpt && <span className="ml-1">✓</span>}
                                                    {isSelectedOpt && !isCorrectOpt && <span className="ml-1">✗</span>}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {q.explanation && (
                                        <p className="text-xs text-white/40 pl-7 italic">
                                            💡 {q.explanation}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 pl-7 text-[10px] text-white/30">
                                        <span>⏱️ {formatTime(timeSpent)}</span>
                                        {revisions > 0 && <span>🔄 {revisions} revision{revisions > 1 ? 's' : ''}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                    <button onClick={onRestart} className="btn-secondary !py-3 !px-6">
                        🔄 Take Another Test
                    </button>
                    {onViewDashboard && (
                        <button onClick={onViewDashboard} className="btn-primary !py-3 !px-6">
                            📊 Dashboard
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
