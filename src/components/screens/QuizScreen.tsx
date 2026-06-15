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
    const [confidence, setConfidence] = useState(5);
    const [improvement, setImprovement] = useState('');
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
        if (question.type === 'reflection') {
            if (typeof savedAnswer === 'string' && savedAnswer.includes('|')) {
                const [confStr, imp] = savedAnswer.split('|');
                setConfidence(parseInt(confStr) || 5);
                setImprovement(imp || '');
            } else {
                setConfidence(5);
                setImprovement('');
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

    const formatTimeDisplay = (seconds: number): string => {
        if (seconds === 0) return 'No time limit';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? (secs > 0 ? `${mins}m ${secs}s` : `${mins} min`) : `${secs} sec`;
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
                        confidence={confidence}
                        improvement={improvement}
                        onConfidenceChange={value => {
                            setConfidence(value);
                            onAnswer(question.id, `${value}|${improvement}`);
                        }}
                        onImprovementChange={text => {
                            setImprovement(text);
                            onAnswer(question.id, `${confidence}|${text}`);
                        }}
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
        <section className="min-h-screen flex flex-col p-4 md:p-6">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    {/* Scenario badge */}
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-white/70">
                        Scenario {currentScenarioNumber}
                    </div>
                    <div className="phase-badge">
                        Phase {question.phase}: {question.phaseName}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 flex-1 min-w-0 max-w-xs">
                    <div className="h-2 flex-1 rounded-full bg-white/20 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                            style={{
                                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                            }}
                        />
                    </div>
                    <span className="text-sm text-white/70 whitespace-nowrap">
                        {currentQuestionIndex + 1}/{questions.length}
                    </span>
                </div>

                {/* Dual Timers */}
                <div className="flex items-center gap-3">
                    {/* Per-question timer */}
                    {question.timeLimit > 0 ? (
                        <div
                            className={`timer-container ${getQuestionTimerClasses()}`}
                            title="Time for this question"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                            <span className="font-mono font-medium text-sm">
                                {questionTimer.formattedTime}
                            </span>
                            {questionTimer.isOvertime && (
                                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">OT</span>
                            )}
                        </div>
                    ) : (
                        <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs">
                            ✨ No limit
                        </div>
                    )}

                    {/* Overall scenario timer */}
                    {scenario.totalTimeLimit && scenario.totalTimeLimit > 0 && (
                        <div
                            className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium flex items-center gap-1.5 ${getOverallTimerClasses()}`}
                            title="Total time for this scenario"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Total</span>
                            <span>{overallTimer.formattedTime}</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 grid gap-6 lg:grid-cols-3">
                {/* Scenario sidebar */}
                <div className="lg:col-span-1">
                    <ScenarioCard scenario={scenario} />
                </div>

                {/* Question panel */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="mb-4 flex items-center gap-3 text-sm text-white/60">
                        <span>
                            Phase {question.phase}: {question.phaseName}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/10">
                            {question.timeLimit > 0
                                ? `⏱️ ${formatTimeDisplay(question.timeLimit)}`
                                : '✨ Take your time'}
                        </span>
                    </div>

                    {renderQuestion()}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between gap-4 mt-6">
                <button
                    onClick={handlePrevious}
                    disabled={isFirstQuestion}
                    className="btn-secondary"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                </button>

                {isLastQuestion ? (
                    <button onClick={onCompleteScenario} className="btn-success">
                        <span>Submit Scenario {currentScenarioNumber}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </button>
                ) : (
                    <button onClick={onNext} className="btn-primary">
                        <span>Next</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>
        </section>
    );
}
