import { CustomExamResults } from './CustomQuizScreen';

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

    // Derive cognitive insight from behavioral data
    const avgTime = avgTimePerQuestion;
    const skippedCount = questions.length - Object.keys(selectedAnswers).length;
    let cognitiveInsight = '';
    let insightEmoji = '';

    if (percentage >= 80 && avgTime < 30 && totalRevisions <= 2) {
        cognitiveInsight = 'Fast Learner';
        insightEmoji = '⚡';
    } else if (percentage >= 70 && totalRevisions >= 3 && avgTime > 30) {
        cognitiveInsight = 'Strategic Thinker';
        insightEmoji = '♟️';
    } else if (percentage >= 60 && avgTime > 45) {
        cognitiveInsight = 'Slow & Thorough';
        insightEmoji = '🔬';
    } else if (percentage >= 50 && avgTime < 20 && totalRevisions <= 1) {
        cognitiveInsight = 'Quick & Careless';
        insightEmoji = '💨';
    } else if (percentage >= 50) {
        cognitiveInsight = 'Steady Achiever';
        insightEmoji = '📊';
    } else if (skippedCount >= 2) {
        cognitiveInsight = 'Disengaged / Avoider';
        insightEmoji = '🚪';
    } else if (percentage < 40 && totalRevisions >= 3) {
        cognitiveInsight = 'Concept Struggler';
        insightEmoji = '🧩';
    } else {
        cognitiveInsight = 'Inconsistent Performer';
        insightEmoji = '🎭';
    }

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

                {/* Score Card */}
                <div className={`glass-card p-6 bg-gradient-to-br ${scoreBg} border border-white/10`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-white/50 uppercase tracking-wider">Your Score</p>
                            <div className={`text-5xl font-black ${scoreColor}`}>
                                {obtainedMarks} / {totalMarks}
                            </div>
                            <div className={`text-2xl font-bold ${scoreColor}`}>
                                {percentage}%
                            </div>
                        </div>

                        <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="text-4xl mb-1">{insightEmoji}</div>
                            <p className="text-sm font-bold text-primary-300">{cognitiveInsight}</p>
                            <p className="text-[10px] text-white/40">Cognitive Profile</p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">{formatTime(totalTime)}</p>
                        <p className="text-xs text-white/40 mt-1">Total Time</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">{formatTime(avgTime)}</p>
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
