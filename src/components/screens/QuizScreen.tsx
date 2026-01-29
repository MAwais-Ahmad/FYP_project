import { useState, useEffect } from 'react';
import { Question, Scenario, Answers } from '../../types/quiz.types';
import { ScenarioCard } from '../ui/ScenarioCard';
import { TextQuestion, MCQQuestion, MultiTextQuestion, RankingQuestion, ReflectionQuestion } from '../questions/QuestionTypes';
import { useTimer } from '../../hooks/useTimer';

interface QuizScreenProps {
    scenario: Scenario;
    questions: Question[];
    currentQuestionIndex: number;
    answers: Answers;
    onAnswer: (questionId: number, answer: string | string[]) => void;
    onNext: () => void;
    onPrevious: () => void;
    onSubmit: () => void;
    onFirstInteraction: (questionId: number) => void;
    onAnswerChange: (questionId: number) => void;
    onQuestionStart: (questionId: number, timeLimit: number, phase: number) => void;
    onQuestionEnd: (questionId: number) => void;
    onBacktrack: () => void;
}

export function QuizScreen({
    scenario, questions, currentQuestionIndex, answers,
    onAnswer, onNext, onPrevious, onSubmit,
    onFirstInteraction, onAnswerChange,
    onQuestionStart, onQuestionEnd, onBacktrack
}: QuizScreenProps) {
    const question = questions[currentQuestionIndex];
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const { formattedTime, timerStatus, start, stop, reset } = useTimer(
        question?.timeLimit || 0,
        () => {
            // Auto-advance when time is up
            if (!isLastQuestion) {
                onQuestionEnd(question.id);
                onNext();
            }
        }
    );

    // Handle question changes
    useEffect(() => {
        if (question) {
            onQuestionStart(question.id, question.timeLimit, question.phase);
            if (question.timeLimit > 0) {
                reset(question.timeLimit);
                start(question.timeLimit);
            } else {
                stop();
            }
        }

        return () => {
            if (question) {
                onQuestionEnd(question.id);
            }
        };
    }, [currentQuestionIndex, question?.id]);

    const handlePrevious = () => {
        onBacktrack();
        onPrevious();
    };

    // Ranking state
    const [ranking, setRanking] = useState([1, 2, 3]);
    const [explanation, setExplanation] = useState('');

    // Reflection state
    const [confidence, setConfidence] = useState(5);
    const [improvement, setImprovement] = useState('');

    // Multi-text state
    const [multiTextValues, setMultiTextValues] = useState(['', '', '']);

    const formatTimeDisplay = (seconds: number): string => {
        if (seconds === 0) return 'No time limit';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
        }
        return `${secs} sec`;
    };

    const renderQuestion = () => {
        if (!question) return null;

        switch (question.type) {
            case 'text':
                return (
                    <TextQuestion
                        question={question}
                        value={(answers[question.id] as string) || ''}
                        onChange={(value) => onAnswer(question.id, value)}
                        onFirstInteraction={() => onFirstInteraction(question.id)}
                    />
                );

            case 'mcq':
            case 'mcq-urgent':
                return (
                    <MCQQuestion
                        question={question}
                        value={(answers[question.id] as string) || ''}
                        onChange={(value) => onAnswer(question.id, value)}
                        onFirstInteraction={() => onFirstInteraction(question.id)}
                        onAnswerChange={() => onAnswerChange(question.id)}
                    />
                );

            case 'multi-text':
                return (
                    <MultiTextQuestion
                        question={question}
                        values={multiTextValues}
                        onChange={(values) => {
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
                        onRankingChange={(newRanking) => {
                            setRanking(newRanking);
                            onAnswer(question.id, `${newRanking.join(',')}|${explanation}`);
                        }}
                        onExplanationChange={(text) => {
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
                        onConfidenceChange={(value) => {
                            setConfidence(value);
                            onAnswer(question.id, `${value}|${improvement}`);
                        }}
                        onImprovementChange={(text) => {
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

    if (!question) {
        return <div>Loading question...</div>;
    }

    return (
        <section className="min-h-screen flex flex-col p-4 md:p-6">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="phase-badge">
                    Phase {question.phase}: {question.phaseName}
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 min-w-48 rounded-full bg-white/20 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-sm text-white/70">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                </div>

                {question.timeLimit > 0 ? (
                    <div className={`timer-container ${timerStatus === 'warning' ? 'timer-warning' : ''} ${timerStatus === 'critical' ? 'timer-critical' : ''}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                        <span className="font-mono font-medium">{formattedTime}</span>
                    </div>
                ) : (
                    <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm">
                        ✨ No time limit
                    </div>
                )}
            </header>

            {/* Content */}
            <div className="flex-1 grid gap-6 lg:grid-cols-3">
                {/* Scenario - sidebar on large screens */}
                <div className="lg:col-span-1">
                    <ScenarioCard scenario={scenario} />
                </div>

                {/* Question */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="text-sm text-white/60">
                            Phase {question.phase}: {question.phaseName}
                        </span>
                        <span className="text-sm px-3 py-1 rounded-full bg-white/10">
                            {question.timeLimit > 0 ? `⏱️ ${formatTimeDisplay(question.timeLimit)}` : '✨ Take your time'}
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
                    <button onClick={onSubmit} className="btn-success">
                        <span>Submit Assessment</span>
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
