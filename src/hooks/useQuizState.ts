import { useState, useCallback } from 'react';
import {
    Answers,
    OverallMetrics,
    Question,
    Scenario,
    ScenarioResult,
    ScreenType,
} from '../types/quiz.types';
import { buildTest, computeVark, gradeTest } from '../data/questionBank';
import {
    calculateDynamicConfidence,
    calculatePerformanceScore,
    heuristicCognitiveFeatures,
} from '../utils/classifyLearner';

// ─── HOOK ────────────────────────────────────────────────────────────────────
// Single-test flow: one randomized 15-question aptitude test built from the
// local question bank, graded locally, then straight to the results dashboard.
export function useQuizState() {
    const [screen, setScreen] = useState<ScreenType>('welcome');
    const [isLoading, setIsLoading] = useState(false);

    // Current test state
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});

    const [difficultyLevel, setDifficultyLevel] = useState(5);
    const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);

    // Student identity (for dashboards / persistence)
    const [studentName, setStudentName] = useState('');

    // Cost tracking (no AI generation — always zero, kept for API compatibility)
    const [tokensUsed, setTokensUsed] = useState(0);
    const [totalCost, setTotalCost] = useState(0);

    const totalQuestions = questions.length;
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    // ── START (build a fresh randomized test from the local bank) ─────────────
    const startQuiz = useCallback(async (chosenDifficulty: number, name?: string) => {
        if (name !== undefined) setStudentName(name);
        setDifficultyLevel(chosenDifficulty);
        setScenarioResults([]);
        setAnswers({});
        setCurrentQuestionIndex(0);

        const test = buildTest();
        setScenario(test.scenario);
        setQuestions(test.questions);
        setScreen('quiz');
    }, []);

    // ── DASHBOARD NAVIGATION ──────────────────────────────────────────────────
    const goToWelcome = useCallback(() => setScreen('welcome'), []);

    // ── COMPLETE TEST (grade locally, save result, show results dashboard) ────
    const completeScenario = useCallback(
        (overallMetrics: OverallMetrics, qMetrics?: any) => {
            if (isLoading) return;
            setIsLoading(true);
            try {
                const grade = gradeTest(questions, answers);
                const accuracyScore = grade.accuracy;

                // Behaviour-driven cognitive features (client-side heuristics)
                const cognitiveFeatures = heuristicCognitiveFeatures(answers, questions, overallMetrics);

                // Implicit, behaviour-driven confidence (no self-report slider)
                const confidence = calculateDynamicConfidence(overallMetrics, accuracyScore, '');

                const perfScore = calculatePerformanceScore(overallMetrics, confidence, accuracyScore, difficultyLevel);

                const result: ScenarioResult = {
                    scenarioNumber: 1,
                    scenarioTitle: scenario?.title || 'General Aptitude Test',
                    difficultyLevel,
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
                    vark: computeVark(questions, answers, overallMetrics.totalAnswerChanges),
                    avgTimeToStart: overallMetrics.avgTimeToStart,
                    totalResponseLength: overallMetrics.totalResponseLength,
                    skippedQuestions: overallMetrics.skippedQuestions,
                    overtimeCount: overallMetrics.overtimeCount,
                    marksObtained: grade.correct,
                    totalMarks: grade.graded,
                    perQuestionCorrect: grade.perQuestion,
                    answers: { ...answers },
                    questions: [...questions],
                    questionsMetrics: qMetrics ? { ...qMetrics } : undefined,
                };

                setScenarioResults([result]);
                setScreen('results');
            } finally {
                setIsLoading(false);
            }
        },
        [scenario, questions, difficultyLevel, answers, isLoading]
    );

    // ── ANSWER / NAVIGATION ───────────────────────────────────────────────────
    const setAnswer = useCallback((questionId: number, answer: string | string[]) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    }, []);

    const goToNextQuestion = useCallback(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [currentQuestionIndex, totalQuestions]);

    const goToPreviousQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    }, [currentQuestionIndex]);

    // Direct jump — used by the question navigation grid.
    const goToQuestion = useCallback((index: number) => {
        if (index >= 0 && index < totalQuestions) {
            setCurrentQuestionIndex(index);
        }
    }, [totalQuestions]);

    // ── RESTART ───────────────────────────────────────────────────────────────
    const restartQuiz = useCallback(() => {
        setScreen('welcome');
        setScenario(null);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setDifficultyLevel(5);
        setScenarioResults([]);
    }, []);

    const addCost = useCallback((tokens: number, cost: number) => {
        setTokensUsed(prev => prev + tokens);
        setTotalCost(prev => prev + cost);
    }, []);

    return {
        screen,
        isLoading,
        scenario,
        questions,
        currentQuestionIndex,
        totalQuestions,
        answers,
        isFirstQuestion,
        isLastQuestion,
        difficultyLevel,
        scenarioResults,
        studentName,
        tokensUsed,
        totalCost,

        startQuiz,
        completeScenario,
        setAnswer,
        goToNextQuestion,
        goToPreviousQuestion,
        goToQuestion,
        restartQuiz,
        goToWelcome,
        setScreen,
        addCost,
    };
}
