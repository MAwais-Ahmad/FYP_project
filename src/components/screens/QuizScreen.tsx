import { useState, useEffect, useRef } from 'react';
import { Question, Scenario, Answers } from '../../types/quiz.types';
import { ScenarioCard } from '../ui/ScenarioCard';
import {
    TextQuestion,
    MCQQuestion,
    MultiTextQuestion,
    RankingQuestion,
    ReflectionQuestion,
} from '../questions/QuestionTypes';
import { useTimer } from '../../hooks/useTimer';

interface QuizScreenProps {
    scenario: Scenario;
    questions: Question[];
    currentQuestionIndex: number;
    answers: Answers;
    currentScenarioNumber: number;
    onAnswer: (questionId: number, answer: string | string[]) => void;
    onNext: () => void;
    onPrevious: () => void;
    onJumpToQuestion: (index: number) => void;
    onCompleteScenario: () => void;
    onFirstInteraction: (questionId: number) => void;
    onAnswerChange: (questionId: number) => void;
    onQuestionStart: (questionId: number, timeLimit: number, phase: number) => void;
    onQuestionEnd: (questionId: number) => void;
    onBacktrack: () => void;
}

export function QuizScreen({
    scenario,
    questions,
    currentQuestionIndex,
    answers,
    currentScenarioNumber,
    onAnswer,
    onNext,
    onPrevious,
    onJumpToQuestion,
    onCompleteScenario,
    onFirstInteraction,
    onAnswerChange,
    onQuestionStart,
    onQuestionEnd,
    onBacktrack,
}: QuizScreenProps) {
    const question = questions[currentQuestionIndex];
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    // Per-question timer (counts into overtime, no auto-kick)
    const questionTimer = useTimer(question?.timeLimit || 0);

    // Overall scenario timer (counts down from totalTimeLimit)
    const overallTimer = useTimer(scenario.totalTimeLimit || 600);
    const overallStarted = useRef(false);

    // Start overall timer once on mount
    useEffect(() => {
        if (!overallStarted.current && scenario.totalTimeLimit) {
            overallTimer.reset(scenario.totalTimeLimit);
            overallTimer.start(scenario.totalTimeLimit);
            overallStarted.current = true;
        }
    }, [scenario.totalTimeLimit]);

    // Per-question timer management
    useEffect(() => {
        if (question) {
            onQuestionStart(question.id, question.timeLimit, question.phase);
            if (question.timeLimit > 0) {
                questionTimer.reset(question.timeLimit);
                questionTimer.start(question.timeLimit);
            } else {
                questionTimer.stop();
            }
        }
        return () => {
            if (question) onQuestionEnd(question.id);
        };
    }, [currentQuestionIndex, question?.id]);

    // Local state for composite question types
    const [ranking, setRanking] = useState([1, 2, 3]);
    const [explanation, setExplanation] = useState('');
    const [multiTextValues, setMultiTextValues] = useState(['', '', '']);

    // Restore or reset local state when question changes
    useEffect(() => {
        if (!question) return;
        const savedAnswer = answers[question.id];

        if (question.type === 'ranking') {
            if (typeof savedAnswer === 'string' && savedAnswer.includes('|')) {
                const [rankStr, exp] = savedAnswer.split('|');
                setRanking(rankStr.split(',').map(Number));
                setExplanation(exp || '');
            } else {
                setRanking([1, 2, 3]);
                setExplanation('');
            }
        }
        if (question.type === 'multi-text') {
            if (Array.isArray(savedAnswer)) {
                setMultiTextValues(savedAnswer);
            } else {
                setMultiTextValues(['', '', '']);
            }
        }
    }, [question?.id]);

    const handlePrevious = () => {
        onBacktrack();
        onPrevious();
    };

    // Direct jump (Improvement #9). Record a backtrack only when moving to an
    // EARLIER question, keeping behavioural metrics accurate.
    const handleJump = (targetIndex: number) => {
        if (targetIndex === currentQuestionIndex) return;
        if (targetIndex < currentQuestionIndex) onBacktrack();
        onJumpToQuestion(targetIndex);
    };

    // Has the student meaningfully answered a given question?
    const isAnswered = (q: Question): boolean => {
        const a = answers[q.id];
        if (a == null) return false;
        if (Array.isArray(a)) return a.some(s => (s || '').trim().length > 0);
        const s = String(a);
        if (q.type === 'ranking') return (s.split('|')[1] || '').trim().length > 0;
        return s.trim().length > 0;
    };

    // Get solutions from the multi-text question (Q3) so ranking question can display them
    const multiTextQuestion = questions.find(q => q.type === 'multi-text');
    const plannedSolutions: string[] =
        multiTextQuestion && answers[multiTextQuestion.id]
            ? (answers[multiTextQuestion.id] as string[])
            : ['', '', ''];

    const renderQuestion = () => {
        if (!question) return null;

        switch (question.type) {
            case 'text':
                return (
                    <TextQuestion
                        question={question}
                        value={(answers[question.id] as string) || ''}
                        onChange={value => onAnswer(question.id, value)}
                        onFirstInteraction={() => onFirstInteraction(question.id)}
                    />
                );

            case 'mcq':
            case 'mcq-urgent':
                return (
                    <MCQQuestion
                        question={question}
                        value={(answers[question.id] as string) || ''}
                        onChange={value => onAnswer(question.id, value)}
                        onFirstInteraction={() => onFirstInteraction(question.id)}
                        onAnswerChange={() => onAnswerChange(question.id)}
                    />
                );

            case 'multi-text':
                return (
                    <MultiTextQuestion
                        question={question}
                        values={multiTextValues}
                        onChange={values => {
                            setMultiTextValues(values);
                            onAnswer(question.id, values);
                        }}
                        onFirstInteraction={() => onFirstInteraction(question.id)}
                    />
                );

            case 'ranking':
                return (
                    <RankingQuestion
                        question={question}
                        ranking={ranking}
                        explanation={explanation}
                        solutions={plannedSolutions}
                        onRankingChange={newRanking => {
                            setRanking(newRanking);
                            onAnswer(question.id, `${newRanking.join(',')}|${explanation}`);
                        }}
                        onExplanationChange={text => {
                            setExplanation(text);
                            onAnswer(question.id, `${ranking.join(',')}|${text}`);
                        }}
                        onFirstInteraction={() => onFirstInteraction(question.id)}
                        onAnswerChange={() => onAnswerChange(question.id)}
                    />
                );

            case 'reflection':
                return (
                    <ReflectionQuestion
                        question={question}
                        value={(answers[question.id] as string) || ''}
                        onChange={text => onAnswer(question.id, text)}
                        onFirstInteraction={() => onFirstInteraction(question.id)}
                    />
                );

            default:
                return <p>Unknown question type</p>;
        }
    };

    if (!question) return <div>Loading question...</div>;

    // Timer status classes
    const getQuestionTimerClasses = () => {
        switch (questionTimer.timerStatus) {
            case 'overtime':
                return 'bg-orange-500/20 border-orange-400/40 text-orange-300';
            case 'critical':
                return 'timer-critical';
            case 'warning':
                return 'timer-warning';
            default:
                return '';
        }
    };

    const getOverallTimerClasses = () => {
        switch (overallTimer.timerStatus) {
            case 'overtime':
                return 'bg-red-500/20 border-red-400/40 text-red-300';
            case 'critical':
                return 'bg-red-500/15 border-red-400/30 text-red-300';
            case 'warning':
                return 'bg-amber-500/15 border-amber-400/30 text-amber-300';
            default:
                return 'bg-white/10 border-white/20 text-white/70';
        }
    };

    return (
        <section className="h-screen flex flex-col p-3 md:p-4 overflow-hidden">
            {/* Header (compact) */}
            <header className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-white/70">
                        Scenario {currentScenarioNumber}
                    </div>
                    <div className="phase-badge !px-3 !py-1 !text-xs">
                        P{question.phase}: {question.phaseName}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 flex-1 min-w-0 max-w-xs">
                    <div className="h-2 flex-1 rounded-full bg-white/20 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs text-white/70 whitespace-nowrap">
                        {currentQuestionIndex + 1}/{questions.length}
                    </span>
                </div>

                {/* Dual Timers */}
                <div className="flex items-center gap-2">
                    {question.timeLimit > 0 ? (
                        <div className={`timer-container !px-3 !py-1 ${getQuestionTimerClasses()}`} title="Time for this question">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                            <span className="font-mono font-medium text-sm">{questionTimer.formattedTime}</span>
                            {questionTimer.isOvertime && (
                                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">OT</span>
                            )}
                        </div>
                    ) : (
                        <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs">
                            ✨ No limit
                        </div>
                    )}

                    {scenario.totalTimeLimit && scenario.totalTimeLimit > 0 && (
                        <div
                            className={`px-3 py-1 rounded-full border text-xs font-mono font-medium flex items-center gap-1.5 ${getOverallTimerClasses()}`}
                            title="Total time for this scenario"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Total</span>
                            <span>{overallTimer.formattedTime}</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Content — fills remaining height; each column scrolls internally */}
            <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-3">
                {/* Scenario sidebar */}
                <div className="lg:col-span-1 min-h-0 overflow-y-auto pr-1">
                    <ScenarioCard scenario={scenario} />
                </div>

                {/* Question panel */}
                <div className="lg:col-span-2 min-h-0 glass-card p-4 md:p-5 overflow-y-auto">
                    {renderQuestion()}
                </div>
            </div>

            {/* Navigation bar — always visible above the fold */}
            <div className="shrink-0 mt-3 flex items-center justify-between gap-3">
                <button onClick={handlePrevious} disabled={isFirstQuestion} className="btn-secondary !py-2 !px-4 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Question navigation grid (jump to any question) */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {questions.map((q, idx) => {
                        const active = idx === currentQuestionIndex;
                        const answered = isAnswered(q);
                        return (
                            <button
                                key={q.id}
                                onClick={() => handleJump(idx)}
                                title={`Q${idx + 1} · ${q.phaseName}${answered ? ' · answered' : ''}`}
                                className={`w-8 h-8 rounded-full text-xs font-semibold border transition-all flex items-center justify-center
                                    ${active
                                        ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white border-white/40 ring-2 ring-primary-400/50 scale-110'
                                        : answered
                                            ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/40'
                                            : 'bg-white/10 text-white/50 border-white/15 hover:bg-white/20'}`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>

                {isLastQuestion ? (
                    <button onClick={onCompleteScenario} className="btn-success !py-2 !px-4 text-sm">
                        <span className="hidden sm:inline">Submit Scenario {currentScenarioNumber}</span>
                        <span className="sm:hidden">Submit</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </button>
                ) : (
                    <button onClick={onNext} className="btn-primary !py-2 !px-4 text-sm">
                        <span className="hidden sm:inline">Next</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>
        </section>
    );
}
