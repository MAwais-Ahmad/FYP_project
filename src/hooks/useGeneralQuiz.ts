import { useState, useCallback } from 'react';
import {
    Answers,
    OverallMetrics,
    Question,
    Scenario,
    ScenarioResult,
} from '../types/quiz.types';
import { buildTest, computeVark, gradeTest } from '../data/questionBank';
import {
    calculateDynamicConfidence,
    calculatePerformanceScore,
    heuristicCognitiveFeatures,
} from '../utils/classifyLearner';

// ─── GENERAL APTITUDE QUIZ STATE ──────────────────────────────────────────────
// Self-contained state for the single-test general aptitude quiz. It lives
// ALONGSIDE the scenario-based useQuizState (which powers AI Scenario tests),
// so the two flows never interfere. Screen routing is driven by App.tsx.
export function useGeneralQuiz() {
    const [gScenario, setGScenario] = useState<Scenario | null>(null);
    const [gQuestions, setGQuestions] = useState<Question[]>([]);
    const [gCurrentIndex, setGCurrentIndex] = useState(0);
    const [gAnswers, setGAnswers] = useState<Answers>({});
    const [gResult, setGResult] = useState<ScenarioResult | null>(null);
    const [gStudentName, setGStudentName] = useState('');
    const [gLoading, setGLoading] = useState(false);
    const [gGenerating, setGGenerating] = useState(false); // true while AI builds the test

    const gTotal = gQuestions.length;
    const gIsFirst = gCurrentIndex === 0;
    const gIsLast = gCurrentIndex === gTotal - 1;

    // Build a fresh AI-generated test (with local fallback) and reset all
    // per-test state. Async because generation calls the server.
    const startGeneralQuiz = useCallback(async (name?: string) => {
        if (name !== undefined) setGStudentName(name);
        setGAnswers({});
        setGCurrentIndex(0);
        setGResult(null);
        setGScenario(null);
        setGQuestions([]);
        setGGenerating(true);
        try {
            const test = await buildTest();
            setGScenario(test.scenario);
            setGQuestions(test.questions);
            return test;
        } finally {
            setGGenerating(false);
        }
    }, []);

    // Grade locally, derive cognitive features + VARK, store the result.
    const completeGeneralQuiz = useCallback(
        (overallMetrics: OverallMetrics, qMetrics?: any): ScenarioResult | null => {
            if (gLoading) return null;
            setGLoading(true);
            try {
                const grade = gradeTest(gQuestions, gAnswers);
                // Profiling (classification, confidence, performance, the Accuracy
                // radar) uses OBJECTIVE correctness so attempt-based open-ended marks
                // don't inflate it. The X/N marks card still uses grade.correct.
                const accuracyScore = grade.objectiveAccuracy;
                const cognitiveFeatures = heuristicCognitiveFeatures(gAnswers, gQuestions, overallMetrics);

                // Open-ended written answers feed the implicit confidence analysis
                const reflectionText = gQuestions
                    .filter(q => q.category === 'psych')
                    .map(q => {
                        const a = gAnswers[q.id];
                        return Array.isArray(a) ? a.join(' ') : (a || '');
                    })
                    .join(' ');
                const confidence = calculateDynamicConfidence(overallMetrics, accuracyScore, reflectionText);
                const perfScore = calculatePerformanceScore(overallMetrics, confidence, accuracyScore, 5);

                // Itemized per-question log so the AI tutor can explain, precisely,
                // why any given answer was right/wrong and how it maps to the score.
                const letterToOption = (q: any, letter?: string) => {
                    if (!q.options || !letter) return letter || '';
                    const idx = letter.toUpperCase().charCodeAt(0) - 65;
                    return q.options[idx] ? `${letter}) ${q.options[idx]}` : letter;
                };
                const itemizedDetails = gQuestions.map((q) => {
                    const raw = gAnswers[q.id];
                    const rawStr = Array.isArray(raw) ? raw.filter(Boolean).join(' | ') : (raw ?? '');
                    const isMcq = q.type === 'mcq';
                    const ansDisplay = isMcq ? letterToOption(q, rawStr as string) : (rawStr || '[No Answer]');
                    const correctDisplay = q.correctAnswer
                        ? (isMcq ? letterToOption(q, q.correctAnswer) : q.correctAnswer)
                        : (q.category === 'psych' ? 'Open-ended (no single correct answer)' : undefined);
                    return {
                        id: q.id,
                        q: q.question,
                        type: q.category ? `${q.type}/${q.category}` : q.type,
                        marks: 1,
                        ans: String(ansDisplay),
                        correct: correctDisplay,
                        isCorrect: grade.perQuestion[q.id],
                        revisions: qMetrics?.[q.id]?.answerChanges,
                    };
                });

                const result: ScenarioResult = {
                    scenarioNumber: 1,
                    scenarioTitle: gScenario?.title || 'General Aptitude Test',
                    difficultyLevel: 5,
                    avgResponseTime: overallMetrics.avgResponseTime,
                    totalAnswerChanges: overallMetrics.totalAnswerChanges,
                    backtrackCount: overallMetrics.backtrackCount,
                    rushedDecisions: overallMetrics.rushedDecisions,
                    overthinkingCount: overallMetrics.overthinkingCount,
                    timeVariance: overallMetrics.timeVariance,
                    confidence,
                    decisionStyle: overallMetrics.decisionStyle,
                    performanceScore: perfScore,
                    accuracyScore,
                    cognitive: cognitiveFeatures,
                    vark: computeVark(gQuestions, gAnswers, overallMetrics.totalAnswerChanges),
                    avgTimeToStart: overallMetrics.avgTimeToStart,
                    totalResponseLength: overallMetrics.totalResponseLength,
                    skippedQuestions: overallMetrics.skippedQuestions,
                    overtimeCount: overallMetrics.overtimeCount,
                    marksObtained: grade.correct,
                    totalMarks: grade.graded,
                    perQuestionCorrect: grade.perQuestion,
                    itemizedDetails,
                    answers: { ...gAnswers },
                    questions: [...gQuestions],
                    questionsMetrics: qMetrics ? { ...qMetrics } : undefined,
                };
                setGResult(result);
                return result;
            } finally {
                setGLoading(false);
            }
        },
        [gScenario, gQuestions, gAnswers, gLoading]
    );

    const setGeneralAnswer = useCallback((questionId: number, answer: string | string[]) => {
        setGAnswers(prev => ({ ...prev, [questionId]: answer }));
    }, []);

    const gNext = useCallback(() => {
        setGCurrentIndex(prev => (prev < gTotal - 1 ? prev + 1 : prev));
    }, [gTotal]);

    const gPrev = useCallback(() => {
        setGCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
    }, []);

    const gJumpTo = useCallback((index: number) => {
        if (index >= 0 && index < gTotal) setGCurrentIndex(index);
    }, [gTotal]);

    const resetGeneral = useCallback(() => {
        setGScenario(null);
        setGQuestions([]);
        setGCurrentIndex(0);
        setGAnswers({});
        setGResult(null);
    }, []);

    return {
        gScenario,
        gQuestions,
        gCurrentIndex,
        gAnswers,
        gResult,
        gStudentName,
        gLoading,
        gGenerating,
        gTotal,
        gIsFirst,
        gIsLast,
        startGeneralQuiz,
        completeGeneralQuiz,
        setGeneralAnswer,
        gNext,
        gPrev,
        gJumpTo,
        resetGeneral,
    };
}
