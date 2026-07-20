import { useEffect, useRef } from 'react';
import { CustomExamResults } from './CustomQuizScreen';
import { classifyLearner, LEARNER_CATEGORIES, heuristicCognitiveFeatures, calculateDynamicConfidence } from '../../utils/classifyLearner';
import { OverallMetrics } from '../../types/quiz.types';
import { addRecord, buildCustomRecord } from '../../utils/storage';
import { saveRecord } from '../../services/api';

interface CustomResultsScreenProps {
    results: CustomExamResults;
    onRestart: () => void;
    onViewDashboard?: () => void;
    studentName?: string;
    sessionId?: string | null;
}

export function CustomResultsScreen({ results, onRestart, onViewDashboard, studentName, sessionId }: CustomResultsScreenProps) {
    const {
        examTitle, totalMarks, obtainedMarks, percentage, totalTime, avgTimePerQuestion,
        questions, graded, selectedAnswers, questionTimes, revisionCounts, totalRevisions,
        cognitive: serverCognitive, mcqMarks, shortMarks,
    } = results;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const gradedById: Record<number, { awardedMarks: number; correct?: boolean; feedback?: string; pointsCovered?: number; totalPoints?: number }> = {};
    (graded || []).forEach(g => { gradedById[g.id] = g; });

    const answeredIds = Object.entries(selectedAnswers).filter(([, v]) => v && v.toString().trim().length > 0).map(([k]) => Number(k));
    const skippedCount = questions.length - answeredIds.length;
    const accuracyScore = totalMarks > 0 ? obtainedMarks / totalMarks : 0;

    const hasWritten = questions.some(q => q.type === 'short' || q.type === 'long');

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
        questionsAnswered: answeredIds.length,
        totalResponseLength: 0,
        skippedQuestions: skippedCount,
        overtimeCount: overtimeVal,
        timeTrend: timeTrendVal,
        decisionStyle: meanTime < 25 ? 'impulsive' : meanTime > 60 ? 'deliberate' : 'balanced',
    };

    // Prefer the AI's cumulative cognitive evaluation of the WRITTEN answers.
    // Fall back to the behavioral heuristic for pure-MCQ exams (no written text).
    const cognitive = (hasWritten && serverCognitive)
        ? serverCognitive
        : heuristicCognitiveFeatures(selectedAnswers as any, [], overallMetrics);
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

    // Persist this custom-exam result exactly once — to localStorage (personal
    // dashboard) and to the server. When taken as part of a session, sessionId is
    // included so the host's session results pick it up.
    const savedRef = useRef(false);
    useEffect(() => {
        if (savedRef.current) return;
        savedRef.current = true;

        const itemizedDetails = (questions || []).map((q: any) => {
            const given = selectedAnswers[q.id];
            const isMcq = q.type === 'mcq';
            const correctStr = isMcq ? q.correctAnswer : Array.isArray(q.keyPoints) ? q.keyPoints.join(', ') : '';
            return {
                id: q.id,
                q: q.question,
                type: q.type,
                marks: q.marks,
                ans: given != null ? (Array.isArray(given) ? given.join(' | ') : String(given)) : '[No Answer]',
                correct: correctStr || undefined,
                isCorrect: isMcq && given ? String(given).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase() : undefined,
                time: (questionTimes && questionTimes[q.id]) || 0,
            };
        });

        const customScenarioResults: any[] = [{
            scenarioNumber: 1,
            scenarioTitle: examTitle || 'Custom Exam',
            difficultyLevel: 5,
            avgResponseTime: meanTime,
            totalAnswerChanges: totalRevisions,
            backtrackCount: 0,
            rushedDecisions: rushedCount,
            overthinkingCount: overthinkingVal,
            timeVariance: varianceVal.toFixed(2),
            confidence,
            decisionStyle: overallMetrics.decisionStyle,
            performanceScore: accuracyScore,
            accuracyScore,
            cognitive,
            avgTimeToStart: 2.5,
            totalResponseLength: 0,
            skippedQuestions: skippedCount,
            overtimeCount: overtimeVal,
            answers: selectedAnswers as any,
            questions: questions || [],
            itemizedDetails,
        }];

        const record = buildCustomRecord(
            studentName || 'Anonymous',
            categoryResult,
            cognitive,
            overallMetrics,
            accuracyScore,
            confidence,
            customScenarioResults,
            obtainedMarks,
            totalMarks,
        );
        addRecord(record);
        saveRecord(sessionId ? { ...record, sessionId } : record).catch(err => {
            console.error('Record save failed (kept in local storage):', err?.message || err);
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                            {hasWritten && (
                                <p className="text-xs text-white/40">
                                    MCQ: {mcqMarks} marks · Written: {shortMarks} marks
                                </p>
                            )}
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

                {/* Cognitive breakdown from written answers */}
                {hasWritten && serverCognitive && (
                    <div className="glass-card p-5 space-y-3">
                        <h2 className="text-lg font-bold">🧠 Written-Answer Cognitive Analysis</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {([
                                { key: 'reflection_depth', label: 'Reflection Depth' },
                                { key: 'self_awareness', label: 'Self-Awareness' },
                                { key: 'learning_orientation', label: 'Learning Orientation' },
                                { key: 'creativity_score', label: 'Creativity' },
                            ] as const).map(m => (
                                <div key={m.key} className="bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-primary-300">
                                        {Math.round((serverCognitive as any)[m.key] * 100)}%
                                    </p>
                                    <p className="text-[10px] text-white/40 mt-1">{m.label}</p>
                                </div>
                            ))}
                        </div>
                        {serverCognitive.insights && serverCognitive.insights.length > 0 && (
                            <ul className="text-xs text-white/60 space-y-1 pt-2 border-t border-white/10">
                                {serverCognitive.insights.map((ins, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-primary-400">•</span>
                                        <span>{ins}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

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
                            const g = gradedById[q.id];
                            const awarded = g ? g.awardedMarks : 0;
                            const isSkipped = !selected || selected.toString().trim().length === 0;
                            const isWritten = q.type === 'short' || q.type === 'long';
                            const typeLabel = q.type === 'long' ? 'Long' : q.type === 'short' ? 'Short' : 'MCQ';
                            const typeBadge = q.type === 'long'
                                ? 'bg-amber-500/20 text-amber-300'
                                : q.type === 'short'
                                ? 'bg-fuchsia-500/20 text-fuchsia-300'
                                : 'bg-sky-500/20 text-sky-300';
                            const fullMarks = awarded >= q.marks && !isSkipped;
                            const partial = awarded > 0 && awarded < q.marks;
                            const timeSpent = questionTimes[q.id] || 0;
                            const revisions = revisionCounts[q.id] || 0;

                            const borderTone = isSkipped
                                ? 'border-yellow-500/20 bg-yellow-500/5'
                                : fullMarks
                                ? 'border-green-500/20 bg-green-500/5'
                                : partial
                                ? 'border-amber-500/20 bg-amber-500/5'
                                : 'border-red-500/20 bg-red-500/5';

                            return (
                                <div key={q.id} className={`p-4 rounded-xl border space-y-3 ${borderTone}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 flex-1">
                                            <span className="text-lg mt-0.5">
                                                {isSkipped ? '⏭️' : fullMarks ? '✅' : partial ? '🟡' : '❌'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                    <span className="text-white/40">Q{i + 1}.</span> {q.question}
                                                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${typeBadge}`}>
                                                        {typeLabel}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`text-sm font-bold ${fullMarks ? 'text-green-400' : partial ? 'text-amber-400' : 'text-red-400'}`}>
                                                {awarded}/{q.marks}
                                            </span>
                                        </div>
                                    </div>

                                    {/* MCQ option review */}
                                    {!isWritten && (
                                        <div className="grid grid-cols-2 gap-2 pl-7">
                                            {q.options.map((opt, oi) => {
                                                const optLetter = opt.charAt(0);
                                                const isSelectedOpt = selected === optLetter;
                                                const isCorrectOpt = q.correctAnswer === optLetter;

                                                let optClass = 'border-white/5 bg-white/5 text-white/50';
                                                if (isCorrectOpt) optClass = 'border-green-500/30 bg-green-500/10 text-green-300';
                                                if (isSelectedOpt && !isCorrectOpt) optClass = 'border-red-500/30 bg-red-500/10 text-red-300 line-through';

                                                return (
                                                    <div key={oi} className={`text-xs p-2 rounded-lg border ${optClass}`}>
                                                        {opt}
                                                        {isCorrectOpt && <span className="ml-1">✓</span>}
                                                        {isSelectedOpt && !isCorrectOpt && <span className="ml-1">✗</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Written answer review */}
                                    {isWritten && (
                                        <div className="pl-7 space-y-2">
                                            <div className="text-xs bg-white/5 rounded-lg p-3 border border-white/10">
                                                <p className="text-white/40 mb-1">Your answer:</p>
                                                <p className="text-white/80 whitespace-pre-wrap">
                                                    {isSkipped ? <span className="italic text-white/30">(no answer)</span> : selected}
                                                </p>
                                            </div>
                                            {q.type === 'long' && typeof g?.pointsCovered === 'number' && g?.totalPoints ? (
                                                <p className="text-[11px] text-amber-300/80">
                                                    ✔️ Covered {g.pointsCovered} of {g.totalPoints} expected points
                                                </p>
                                            ) : null}
                                            {g?.feedback && (
                                                <p className="text-xs text-accent-300">
                                                    🧑‍🏫 {g.feedback}
                                                </p>
                                            )}
                                            {q.keyPoints && q.keyPoints.length > 0 && (
                                                <p className="text-[11px] text-white/40">
                                                    Expected key points: {q.keyPoints.join('; ')}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {q.explanation && (
                                        <p className="text-xs text-white/40 pl-7 italic">💡 {q.explanation}</p>
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
