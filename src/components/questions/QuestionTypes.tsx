import { useState, useEffect } from 'react';
import { Question } from '../../types/quiz.types';

interface TextQuestionProps {
    question: Question;
    value: string;
    onChange: (value: string) => void;
    onFirstInteraction: () => void;
}

export function TextQuestion({ question, value, onChange, onFirstInteraction }: TextQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        }
        onChange(e.target.value);
    };

    return (
        <div className="space-y-4">
            {question.context && (
                <p className="text-white/70 italic bg-white/5 p-3 rounded-lg">{question.context}</p>
            )}

            <h3 className="text-xl font-medium">{question.question}</h3>

            {question.hint && (
                <p className="text-white/60 text-sm">💡 {question.hint}</p>
            )}

            <div className="relative">
                <textarea
                    className="text-input"
                    value={value}
                    onChange={handleChange}
                    placeholder="Type your answer here..."
                    rows={4}
                />
                <span className="absolute bottom-3 right-3 text-white/40 text-sm">
                    {value.length} characters
                </span>
            </div>
        </div>
    );
}

interface MCQQuestionProps {
    question: Question;
    value: string;
    onChange: (value: string) => void;
    onFirstInteraction: () => void;
    onAnswerChange: () => void;
}

export function MCQQuestion({ question, value, onChange, onFirstInteraction, onAnswerChange }: MCQQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleSelect = (option: string) => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        } else if (value !== option) {
            onAnswerChange();
        }
        onChange(option);
    };

    return (
        <div className="space-y-4">
            {question.type === 'mcq-urgent' && question.urgentUpdate && (
                <div className="urgent-banner">
                    <span className="text-2xl">🚨</span>
                    <span className="font-medium">{question.urgentUpdate}</span>
                </div>
            )}

            <h3 className="text-xl font-medium">{question.question}</h3>

            <div className="space-y-3">
                {question.options?.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isSelected = value === letter;

                    return (
                        <label
                            key={idx}
                            className={`option-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelect(letter)}
                        >
                            <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={letter}
                                checked={isSelected}
                                onChange={() => { }}
                                className="sr-only"
                            />
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold 
                ${isSelected ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/70'}`}>
                                {letter}
                            </span>
                            <span className="flex-1">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                            {isSelected && (
                                <svg className="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

interface MultiTextQuestionProps {
    question: Question;
    values: string[];
    onChange: (values: string[]) => void;
    onFirstInteraction: () => void;
}

export function MultiTextQuestion({ question, values, onChange, onFirstInteraction }: MultiTextQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleChange = (index: number, value: string) => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        }
        const newValues = [...values];
        newValues[index] = value;
        onChange(newValues);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-medium">{question.question}</h3>

            {question.hint && (
                <p className="text-white/60 text-sm">💡 {question.hint}</p>
            )}

            <div className="space-y-3">
                {[0, 1, 2].map((idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold">
                            {idx + 1}
                        </span>
                        <input
                            type="text"
                            className="text-input flex-1"
                            value={values[idx] || ''}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            placeholder={`Solution ${idx + 1}...`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

interface RankingQuestionProps {
    question: Question;
    ranking: number[];
    explanation: string;
    onRankingChange: (ranking: number[]) => void;
    onExplanationChange: (text: string) => void;
    onFirstInteraction: () => void;
    onAnswerChange: () => void;
}

export function RankingQuestion({
    question, ranking, explanation,
    onRankingChange, onExplanationChange,
    onFirstInteraction, onAnswerChange
}: RankingQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    const labels = ['Best solution', 'Second best', 'Third best'];

    const handleDragStart = (idx: number) => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        }
        setDraggedIdx(idx);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (targetIdx: number) => {
        if (draggedIdx === null || draggedIdx === targetIdx) return;

        const newRanking = [...ranking];
        const [removed] = newRanking.splice(draggedIdx, 1);
        newRanking.splice(targetIdx, 0, removed);
        onRankingChange(newRanking);
        onAnswerChange();
        setDraggedIdx(null);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-medium">{question.question}</h3>

            {question.hint && (
                <p className="text-white/60 text-sm">💡 {question.hint}</p>
            )}

            <p className="text-white/50 text-sm">Drag to reorder</p>

            <div className="space-y-2">
                {ranking.map((rank, idx) => (
                    <div
                        key={rank}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                        className={`ranking-item ${draggedIdx === idx ? 'dragging' : ''}`}
                    >
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold">
                            {idx + 1}
                        </span>
                        <span className="flex-1">{labels[rank - 1]}</span>
                        <span className="text-white/40 cursor-grab">⋮⋮</span>
                    </div>
                ))}
            </div>

            <textarea
                className="text-input"
                value={explanation}
                onChange={(e) => {
                    if (!hasInteracted) {
                        setHasInteracted(true);
                        onFirstInteraction();
                    }
                    onExplanationChange(e.target.value);
                }}
                placeholder="Explain why you ranked them this way..."
                rows={3}
            />
        </div>
    );
}

interface ReflectionQuestionProps {
    question: Question;
    confidence: number;
    improvement: string;
    onConfidenceChange: (value: number) => void;
    onImprovementChange: (text: string) => void;
    onFirstInteraction: () => void;
}

export function ReflectionQuestion({
    question, confidence, improvement,
    onConfidenceChange, onImprovementChange, onFirstInteraction
}: ReflectionQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleInteraction = () => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-medium">{question.question}</h3>

            {/* Confidence Slider */}
            <div className="space-y-3">
                <label className="block text-white/80 font-medium">
                    Rate your confidence in your final decision:
                </label>

                <div className="space-y-2">
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={confidence}
                        onChange={(e) => {
                            handleInteraction();
                            onConfidenceChange(parseInt(e.target.value));
                        }}
                        className="confidence-slider"
                    />

                    <div className="flex justify-between text-xs text-white/50">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <span key={n} className={confidence === n ? 'text-primary-400 font-bold' : ''}>
                                {n}
                            </span>
                        ))}
                    </div>

                    <div className="text-center">
                        <span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 font-bold text-xl">
                            {confidence}
                        </span>
                    </div>
                </div>
            </div>

            {/* Improvement Text */}
            <div className="space-y-3">
                <label className="block text-white/80 font-medium">
                    How would you improve your approach?
                </label>

                <textarea
                    className="text-input"
                    value={improvement}
                    onChange={(e) => {
                        handleInteraction();
                        onImprovementChange(e.target.value);
                    }}
                    placeholder="Reflect on what you would do differently..."
                    rows={4}
                />
            </div>
        </div>
    );
}
