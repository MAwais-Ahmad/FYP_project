import { useState, useEffect, useCallback } from 'react';
import { CustomExamQuestion, GeneratedExam } from '../../types/quiz.types';

interface CustomQuizScreenProps {
    exam: GeneratedExam;
    onComplete: (results: CustomExamResults) => void;
    onBack: () => void;
}

export interface CustomExamResults {
    examTitle: string;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    totalTime: number;
    avgTimePerQuestion: number;
    questions: CustomExamQuestion[];
    selectedAnswers: Record<number, string>;
    questionTimes: Record<number, number>;
    revisionCounts: Record<number, number>;
    totalRevisions: number;
}

export function CustomQuizScreen({ exam, onComplete, onBack }: CustomQuizScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
    const [revisionCounts, setRevisionCounts] = useState<Record<number, number>>({});
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [quizStartTime] = useState(Date.now());
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

    const totalQuestions = exam.questions.length;
    const currentQuestion = exam.questions[currentIndex];
    const progress = ((currentIndex + 1) / totalQuestions) * 100;
    const answeredCount = Object.keys(selectedAnswers).length;

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

    const handleSelectAnswer = (answer: string) => {
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

    const goToNext = () => {
        recordCurrentQuestionTime();
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goToPrevious = () => {
        recordCurrentQuestionTime();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const goToQuestion = (index: number) => {
        recordCurrentQuestionTime();
        setCurrentIndex(index);
    };

    const handleSubmit = () => {
        recordCurrentQuestionTime();
        const totalTime = (Date.now() - quizStartTime) / 1000;

        // Calculate score
        let obtainedMarks = 0;
        for (const q of exam.questions) {
            const selected = selectedAnswers[q.id];
            if (selected && selected === q.correctAnswer) {
                obtainedMarks += q.marks;
            }
        }

        const totalRevisions = Object.values(revisionCounts).reduce((s, v) => s + v, 0);

        const results: CustomExamResults = {
            examTitle: exam.examTitle,
            totalMarks: exam.totalMarks,
            obtainedMarks,
            percentage: Math.round((obtainedMarks / exam.totalMarks) * 100),
            totalTime,
            avgTimePerQuestion: totalTime / totalQuestions,
            questions: exam.questions,
            selectedAnswers,
            questionTimes,
            revisionCounts,
            totalRevisions,
        };

        onComplete(results);
    };

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
                            {currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
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
                    {exam.questions.map((q, i) => (
                        <button
                            key={q.id}
                            onClick={() => goToQuestion(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                i === currentIndex
                                    ? 'bg-primary-500 text-white shadow-lg scale-110'
                                    : selectedAnswers[q.id]
                                    ? 'bg-green-500/30 text-green-300 border border-green-500/30'
                                    : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5'
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}
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
                                    {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                                </span>
                            </div>
                            <h2 className="text-lg font-semibold leading-relaxed">
                                {currentQuestion.question}
                            </h2>
                        </div>

                        {/* Options */}
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
                    </div>

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
                        <div className="text-5xl">📋</div>
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
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowConfirmSubmit(false)}
                                className="btn-secondary !py-2.5 !px-5"
                            >
                                ← Review
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn-primary !py-2.5 !px-6"
                            >
                                ✅ Confirm Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
