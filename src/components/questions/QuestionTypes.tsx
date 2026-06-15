import { useState } from 'react';
import { Question } from '../../types/quiz.types';

// ─── TEXT QUESTION ─────────────────────────────────────────────────────────────

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
                <p className="text-white/70 italic bg-white/5 p-3 rounded-lg border border-white/10">
                    {question.context}
                </p>
            )}
            <h3 className="text-xl font-medium leading-relaxed">{question.question}</h3>
            {question.hint && (
                <p className="text-white/60 text-sm">💡 {question.hint}</p>
            )}
            <div className="relative">
                <textarea
                    className="text-input"
                    value={value}
                    onChange={handleChange}
                    placeholder="Type your answer here..."
                    rows={5}
                />
                <span className="absolute bottom-3 right-3 text-white/40 text-sm">
                    {value.length} chars
                </span>
            </div>
        </div>
    );
}

// ─── MCQ QUESTION ─────────────────────────────────────────────────────────────

interface MCQQuestionProps {
    question: Question;
    value: string;
    onChange: (value: string) => void;
    onFirstInteraction: () => void;
    onAnswerChange: () => void;
}

export function MCQQuestion({
    question,
    value,
    onChange,
    onFirstInteraction,
    onAnswerChange,
}: MCQQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleSelect = (letter: string) => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        } else if (value !== letter) {
            onAnswerChange();
        }
        onChange(letter);
    };

    return (
        <div className="space-y-4">
            {question.type === 'mcq-urgent' && question.urgentUpdate && (
                <div className="urgent-banner">
                    <span className="text-2xl">🚨</span>
                    <span className="font-medium">{question.urgentUpdate}</span>
                </div>
            )}
            <h3 className="text-xl font-medium leading-relaxed">{question.question}</h3>
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
                                onChange={() => {}}
                                className="sr-only"
                            />
                            <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold shrink-0
                                    ${isSelected ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/70'}`}
                            >
                                {letter}
                            </span>
                            <span className="flex-1">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                            {isSelected && (
                                <svg className="w-5 h-5 text-primary-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

// ─── MULTI-TEXT QUESTION ───────────────────────────────────────────────────────

interface MultiTextQuestionProps {
    question: Question;
    values: string[];
    onChange: (values: string[]) => void;
    onFirstInteraction: () => void;
}

export function MultiTextQuestion({
    question,
    values,
    onChange,
    onFirstInteraction,
}: MultiTextQuestionProps) {
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

    const placeholders = [
        'Strategy 1 — e.g., cut proportionally based on each club\'s total budget...',
        'Strategy 2 — e.g., prioritise clubs with lowest alternative funding sources...',
        'Strategy 3 — e.g., ask each club to reduce by 20% and hold a reserve fund...',
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-medium leading-relaxed">{question.question}</h3>
            {question.hint && (
                <p className="text-white/60 text-sm">💡 {question.hint}</p>
            )}
            <div className="space-y-3">
                {[0, 1, 2].map(idx => (
                    <div key={idx} className="flex items-start gap-3">
                        <span className="w-8 h-8 mt-2 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold text-sm shrink-0">
                            {idx + 1}
                        </span>
                        <input
                            type="text"
                            className="text-input flex-1"
                            value={values[idx] || ''}
                            onChange={e => handleChange(idx, e.target.value)}
                            placeholder={placeholders[idx]}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── RANKING QUESTION ─────────────────────────────────────────────────────────

interface RankingQuestionProps {
    question: Question;
    ranking: number[];
    explanation: string;
    solutions: string[]; // actual solutions typed in Q3
    onRankingChange: (ranking: number[]) => void;
    onExplanationChange: (text: string) => void;
    onFirstInteraction: () => void;
    onAnswerChange: () => void;
}

export function RankingQuestion({
    question,
    ranking,
    explanation,
    solutions,
    onRankingChange,
    onExplanationChange,
    onFirstInteraction,
    onAnswerChange,
}: RankingQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    // Display the actual student solution or fall back to a placeholder
    const displayLabel = (rankValue: number): string => {
        const sol = solutions[rankValue - 1];
        if (sol && sol.trim().length > 0) {
            return sol.length > 80 ? sol.slice(0, 77) + '...' : sol;
        }
        return `Strategy ${rankValue}`;
    };

    const handleDragStart = (idx: number) => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        }
        setDraggedIdx(idx);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (targetIdx: number) => {
        if (draggedIdx === null || draggedIdx === targetIdx) return;
        const newRanking = [...ranking];
        const [removed] = newRanking.splice(draggedIdx, 1);
        newRanking.splice(targetIdx, 0, removed);
        onRankingChange(newRanking);
        onAnswerChange();
        setDraggedIdx(null);
    };

    const rankLabels = ['🥇 Best', '🥈 Second', '🥉 Third'];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-medium leading-relaxed">{question.question}</h3>
            {question.hint && (
                <p className="text-white/60 text-sm">💡 {question.hint}</p>
            )}
            <p className="text-white/50 text-sm flex items-center gap-1">
                <span>☰</span> Drag and drop to reorder
            </p>

            <div className="space-y-2">
                {ranking.map((rankValue, idx) => (
                    <div
                        key={rankValue}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                        className={`ranking-item ${draggedIdx === idx ? 'dragging' : ''}`}
                    >
                        <span className="text-sm font-semibold text-white/50 w-14 shrink-0">
                            {rankLabels[idx]}
                        </span>
                        <span className="flex-1 text-sm leading-snug">
                            {displayLabel(rankValue)}
                        </span>
                        <span className="text-white/30 cursor-grab select-none text-lg">⋮⋮</span>
                    </div>
                ))}
            </div>

            <div className="space-y-2 pt-2">
                <label className="text-sm text-white/70 font-medium">
                    Explain your ranking — why is your best strategy better than the others?
                </label>
                <textarea
                    className="text-input"
                    value={explanation}
                    onChange={e => {
                        if (!hasInteracted) {
                            setHasInteracted(true);
                            onFirstInteraction();
                        }
                        onExplanationChange(e.target.value);
                    }}
                    placeholder="Explain your reasoning here..."
                    rows={3}
                />
            </div>
        </div>
    );
}

// ─── REFLECTION QUESTION ──────────────────────────────────────────────────────
// Improvement #3: the self-reported confidence slider has been removed.
// Confidence is now inferred implicitly from behaviour + this reflection text.

interface ReflectionQuestionProps {
    question: Question;
    value: string;
    onChange: (text: string) => void;
    onFirstInteraction: () => void;
}

export function ReflectionQuestion({
    question,
    value,
    onChange,
    onFirstInteraction,
}: ReflectionQuestionProps) {
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleInteraction = () => {
        if (!hasInteracted) {
            setHasInteracted(true);
            onFirstInteraction();
        }
    };

    const words = value.trim().split(/\s+/).filter(Boolean).length;

    return (
        <div className="space-y-5">
            <h3 className="text-xl font-medium leading-relaxed">{question.question}</h3>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-400/20 text-sm text-white/60">
                <span className="text-lg">🪞</span>
                <span>
                    Be honest — there are no marks here. Your confidence is measured automatically
                    from how you worked through the round, so just reflect genuinely.
                </span>
            </div>

            <div className="space-y-3">
                <label className="block text-white/80 font-medium">
                    Looking back, what would you do differently and why?
                </label>
                <div className="relative">
                    <textarea
                        className="text-input"
                        value={value}
                        onChange={e => {
                            handleInteraction();
                            onChange(e.target.value);
                        }}
                        placeholder="Reflect honestly — what would you change about your approach, process, or priorities, and why?"
                        rows={6}
                    />
                    <span className="absolute bottom-3 right-3 text-white/40 text-sm">
                        {words} word{words === 1 ? '' : 's'}
                    </span>
                </div>
            </div>
        </div>
    );
}
