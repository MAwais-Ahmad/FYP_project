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

    const gTotal = gQuestions.length;
    const gIsFirst = gCurrentIndex === 0;
    const gIsLast = gCurrentIndex === gTotal - 1;

    // Build a fresh randomized test and reset all per-test state.
    const startGeneralQuiz = useCallback((name?: string) => {
        if (name !== undefined) setGStudentName(name);
        setGAnswers({});
        setGCurrentIndex(0);
        setGResult(null);
        const test = buildTest();
        setGScenario(test.scenario);
        setGQuestions(test.questions);
    }, []);

    // Grade locally, derive cognitive features + VARK, store the result.
    const completeGeneralQuiz = useCallback(
        (overallMetrics: OverallMetrics, qMetrics?: any): ScenarioResult | null => {
            if (gLoading) return null;
            setGLoading(true);
            try {
                const grade = gradeTest(gQuestions, gAnswers);
                const accuracyScore = grade.accuracy;
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
