import { useState, useEffect, useCallback, useRef } from 'react';
import { CustomExamQuestion, GeneratedExam, GradedQuestion, CognitiveFeatures } from '../../types/quiz.types';
import { gradeExam } from '../../services/api';
import { useTimer } from '../../hooks/useTimer';

interface CustomQuizScreenProps {
    exam: GeneratedExam;
    onComplete: (results: CustomExamResults) => void;
    onBack: () => void;
    sessionId?: string | null;
}

export interface CustomExamResults {
    examTitle: string;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    totalTime: number;
    avgTimePerQuestion: number;
    questions: CustomExamQuestion[];   // WITH answer key (returned by server after grading)
    graded: GradedQuestion[];
    selectedAnswers: Record<number, string>;
    questionTimes: Record<number, number>;
    revisionCounts: Record<number, number>;
    totalRevisions: number;
    cognitive?: CognitiveFeatures | null;
    mcqMarks: number;
    shortMarks: number;
    // Real behavioural telemetry (previously hardcoded on the results screen)
    firstInteractionTimes: Record<number, number>; // per-question latency to first input (s)
    backtrackCount: number;                         // backward navigations to review/edit
    autoSubmitted: boolean;                         // timer forced the submission
    durationSeconds?: number;                       // creator-set overall limit
    timerMode?: 'auto-submit' | 'soft';
}

export function CustomQuizScreen({ exam, onComplete, onBack, sessionId }: CustomQuizScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
    const [revisionCounts, setRevisionCounts] = useState<Record<number, number>>({});
    const [firstInteractionTimes, setFirstInteractionTimes] = useState<Record<number, number>>({});
    const [backtrackCount, setBacktrackCount] = useState(0);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [quizStartTime] = useState(Date.now());
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [isGrading, setIsGrading] = useState(false);
    const [gradeError, setGradeError] = useState('');

    // Snapshot of the last committed written answer per question, used to count
    // genuine revisions on blur (not every keystroke).
    const writtenSnapshots = useRef<Record<number, string>>({});
    // Guards against the overall timer and the button both submitting.
    const submittedRef = useRef(false);

    const totalQuestions = exam.questions.length;
    const currentQuestion = exam.questions[currentIndex];
    const progress = ((currentIndex + 1) / totalQuestions) * 100;
    const answeredCount = Object.values(selectedAnswers).filter(v => v && v.toString().trim().length > 0).length;

    // ── Overall exam timer (creator-set) ─────────────────────────────────────
    const hasTimer = !!exam.durationSeconds && exam.durationSeconds > 0;
    const timer = useTimer(exam.durationSeconds || 0);
    useEffect(() => {
        if (hasTimer) timer.start(exam.durationSeconds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Record time when moving between questions
    const recordCurrentQuestionTime = useCallback(() => {
        const elapsed = (Date.now() - questionStartTime) / 1000;
        setQuestionTimes(prev => ({
            ...prev,
            [currentQuestion.id]: (prev[currentQuestion.id] || 0) + elapsed,
        }));
    }, [questionStartTime, currentQuestion.id]);

    // Reset question timer on navigation
    useEffect(() => {
        setQuestionStartTime(Date.now());
    }, [currentIndex]);

    // Capture latency to first interaction on a question (avgTimeToStart), once.
    const recordFirstInteraction = useCallback(() => {
        const id = currentQuestion.id;
        setFirstInteractionTimes(prev => {
            if (prev[id] !== undefined) return prev;
            return { ...prev, [id]: (Date.now() - questionStartTime) / 1000 };
        });
    }, [currentQuestion.id, questionStartTime]);

    const handleSelectAnswer = (answer: string) => {
        recordFirstInteraction();
        const letter = answer.charAt(0);
        const prevAnswer = selectedAnswers[currentQuestion.id];

        if (prevAnswer && prevAnswer !== letter) {
            setRevisionCounts(prev => ({
                ...prev,
                [currentQuestion.id]: (prev[currentQuestion.id] || 0) + 1,
            }));
        }

        setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: letter }));
    };

    const handleWrittenAnswer = (text: string) => {
        recordFirstInteraction();
        setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: text }));
    };

    // Count a written revision on blur when the answer meaningfully changed after
    // having had content — mirrors MCQ answer-change tracking for text questions.
    const handleWrittenBlur = () => {
        const id = currentQuestion.id;
        const current = (selectedAnswers[id] || '').trim();
        const snapshot = writtenSnapshots.current[id];
        if (snapshot !== undefined && snapshot.length > 0 && current.length > 0 && current !== snapshot) {
            setRevisionCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
        }
        writtenSnapshots.current[id] = current;
    };

    // Navigate, counting backward moves as backtracks (reviewing/editing).
    const navigateTo = (index: number) => {
        recordCurrentQuestionTime();
        if (index < currentIndex) setBacktrackCount(c => c + 1);
        setCurrentIndex(index);
    };

    const goToNext = () => {
        recordCurrentQuestionTime();
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) navigateTo(currentIndex - 1);
    };

    const goToQuestion = (index: number) => {
        navigateTo(index);
    };

    const handleSubmit = async (autoSubmitted = false) => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        timer.stop();
        recordCurrentQuestionTime();
        const totalTime = (Date.now() - quizStartTime) / 1000;
        setIsGrading(true);
        setShowConfirmSubmit(true);
        setGradeError('');

        // Grade on the server: MCQs by key + written answers cumulatively via AI.
        // examId → leak-free stored exam; otherwise send the (manual) exam inline.
        const resp = await gradeExam({
            examId: exam.examId,
            // For a session exam the server loads the paper from the session; for a
            // manual/solo exam without an examId, send it inline.
            exam: exam.examId || sessionId ? undefined : exam,
            answers: selectedAnswers,
            sessionId,
        });

        if (!resp.success || !resp.result) {
            setIsGrading(false);
            submittedRef.current = false; // allow a retry
            if (hasTimer && exam.timerMode !== 'auto-submit') timer.start(timer.timeRemaining);
            setGradeError(resp.error || 'Failed to grade exam. Please try again.');
            return;
        }

        const r = resp.result;
        const totalRevisions = Object.values(revisionCounts).reduce((s, v) => s + v, 0);

        const results: CustomExamResults = {
            examTitle: exam.examTitle,
            totalMarks: r.totalMarks,
            obtainedMarks: r.obtainedMarks,
            percentage: r.totalMarks > 0 ? Math.round((r.obtainedMarks / r.totalMarks) * 100) : 0,
            totalTime,
            avgTimePerQuestion: totalTime / totalQuestions,
            questions: r.questions,
            graded: r.graded,
            selectedAnswers,
            questionTimes,
            revisionCounts,
            totalRevisions,
            cognitive: r.cognitive,
            mcqMarks: r.mcqMarks,
            shortMarks: r.shortMarks,
            firstInteractionTimes,
            backtrackCount,
            autoSubmitted,
            durationSeconds: exam.durationSeconds,
            timerMode: exam.timerMode,
        };

        setIsGrading(false);
        onComplete(results);
    };

    // Auto-submit (or just stop) when the overall timer expires.
    useEffect(() => {
        if (!hasTimer || timer.timeRemaining > 0 || submittedRef.current) return;
        if (exam.timerMode === 'auto-submit') {
            handleSubmit(true);
        }
        // 'soft' mode: let it run into overtime; do nothing here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timer.timeRemaining]);

    const isWritten = currentQuestion.type === 'short' || currentQuestion.type === 'long';
    const isProbe = !!currentQuestion.probe;
    const typeLabel = isProbe ? 'Reflection' : currentQuestion.type === 'long' ? 'Long' : currentQuestion.type === 'short' ? 'Short' : 'MCQ';
    const typeBadgeClass = isProbe
        ? 'bg-teal-500/20 text-teal-300'
        : currentQuestion.type === 'long'
        ? 'bg-amber-500/20 text-amber-300'
        : currentQuestion.type === 'short'
        ? 'bg-fuchsia-500/20 text-fuchsia-300'
        : 'bg-sky-500/20 text-sky-300';
    const currentAnswer = selectedAnswers[currentQuestion.id] || '';

    // Timer chip colour by remaining-time status.
    const timerChipClass = timer.timerStatus === 'overtime'
        ? 'bg-red-500/30 text-red-200 animate-pulse'
        : timer.timerStatus === 'critical'
        ? 'bg-red-500/20 text-red-300'
        : timer.timerStatus === 'warning'
        ? 'bg-yellow-500/20 text-yellow-300'
        : 'bg-white/10 text-white/70';

    return (
        <section className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Progress Bar */}
            <div className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="h-1 bg-white/10">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white/60">
                            Q {currentIndex + 1} of {totalQuestions}
                        </span>
                        <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">
                            {isProbe ? 'Not graded' : `${currentQuestion.marks} mark${currentQuestion.marks > 1 ? 's' : ''}`}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeBadgeClass}`}>
                            {typeLabel}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasTimer && (
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full tabular-nums ${timerChipClass}`}>
                                {timer.timerStatus === 'overtime' ? '⏱️ ' : '⏱ '}{timer.formattedTime}
                            </span>
                        )}
                        <span className="text-xs text-white/40">
                            {answeredCount}/{totalQuestions} answered
                        </span>
                        <button
                            onClick={onBack}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            ✕ Exit
                        </button>
                    </div>
                </div>
            </div>

            {/* Question Navigation Grid */}
            <div className="max-w-4xl mx-auto w-full px-4 pt-4">
                <div className="flex flex-wrap gap-1.5 justify-center">
                    {exam.questions.map((q, i) => {
                        const ans = selectedAnswers[q.id];
                        const isAnswered = ans && ans.toString().trim().length > 0;
                        return (
                            <button
                                key={q.id}
                                onClick={() => goToQuestion(i)}
                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                    i === currentIndex
                                        ? 'bg-primary-500 text-white shadow-lg scale-110'
                                        : isAnswered
                                        ? 'bg-green-500/30 text-green-300 border border-green-500/30'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5'
                                }`}
                            >
                                {i + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-2xl w-full space-y-6">
                    <div className="glass-card p-6 space-y-6">
                        {/* Question Text */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-primary-500/20 text-primary-300 text-xs px-2 py-0.5 rounded-full font-semibold">
                                    Question {currentIndex + 1}
                                </span>
                                <span className="bg-accent-500/20 text-accent-300 text-xs px-2 py-0.5 rounded-full">
                                    {isProbe ? '🧠 Reflection · not graded' : `${currentQuestion.marks} Mark${currentQuestion.marks > 1 ? 's' : ''}`}
                                </span>
                            </div>
                            <h2 className="text-lg font-semibold leading-relaxed">
                                {currentQuestion.question}
                            </h2>
                            {isProbe && (
                                <p className="text-xs text-teal-300/70">
                                    This helps us understand how you think — it doesn't affect your score.
                                </p>
                            )}
                        </div>

                        {/* Answer input: MCQ options OR written textarea */}
                        {isWritten ? (
                            <div className="space-y-2">
                                <textarea
                                    className="text-input min-h-[160px] text-sm resize-y"
                                    value={currentAnswer}
                                    onChange={(e) => handleWrittenAnswer(e.target.value)}
                                    onBlur={handleWrittenBlur}
                                    placeholder="Type your answer here..."
                                    rows={7}
                                />
                                <p className="text-right text-xs text-white/30">
                                    {currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0} words
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {currentQuestion.options.map((option, oi) => {
                                    const letter = option.charAt(0);
                                    const isSelected = selectedAnswers[currentQuestion.id] === letter;

                                    return (
                                        <button
                                            key={oi}
                                            onClick={() => handleSelectAnswer(option)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                                                isSelected
                                                    ? 'border-primary-500/50 bg-primary-500/20 text-white shadow-lg shadow-primary-500/10'
                                                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                                                        isSelected
                                                            ? 'bg-primary-500 text-white'
                                                            : 'bg-white/10 text-white/50'
                                                    }`}
                                                >
                                                    {letter}
                                                </div>
                                                <span className="text-sm">{option.substring(2).trim()}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {gradeError && (
                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                            ⚠️ {gradeError}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={goToPrevious}
                            disabled={currentIndex === 0}
                            className="btn-secondary !py-3 !px-6 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ← Previous
                        </button>

                        {currentIndex === totalQuestions - 1 ? (
                            <button
                                onClick={() => setShowConfirmSubmit(true)}
                                className="btn-primary !py-3 !px-8 text-lg"
                            >
                                ✅ Submit Exam
                            </button>
                        ) : (
                            <button
                                onClick={goToNext}
                                className="btn-primary !py-3 !px-6"
                            >
                                Next →
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Modal */}
            {showConfirmSubmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-5 border border-white/10 shadow-2xl">
                        <div className="text-5xl">{isGrading ? '🤖' : '📋'}</div>
                        {isGrading ? (
                            <>
                                <h2 className="text-xl font-bold">Grading your exam...</h2>
                                <p className="text-sm text-white/60">
                                    Auto-marking MCQs and evaluating your written answers. This takes a few seconds.
                                </p>
                                <div className="flex items-center justify-center gap-2 text-primary-300">
                                    <span className="animate-spin text-2xl">⏳</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold">Submit Exam?</h2>
                                <div className="text-sm text-white/60 space-y-1">
                                    <p>
                                        You answered <span className="text-white font-semibold">{answeredCount}</span> out of{' '}
                                        <span className="text-white font-semibold">{totalQuestions}</span> questions.
                                    </p>
                                    {answeredCount < totalQuestions && (
                                        <p className="text-yellow-400">
                                            ⚠️ {totalQuestions - answeredCount} question{totalQuestions - answeredCount > 1 ? 's are' : ' is'} unanswered.
                                        </p>
                                    )}
                                </div>
                                {gradeError && (
                                    <p className="text-red-400 text-sm">⚠️ {gradeError}</p>
                                )}
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setShowConfirmSubmit(false)}
                                        className="btn-secondary !py-2.5 !px-5"
                                    >
                                        ← Review
                                    </button>
                                    <button
                                        onClick={() => handleSubmit()}
                                        className="btn-primary !py-2.5 !px-6"
                                    >
                                        ✅ Confirm Submit
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
