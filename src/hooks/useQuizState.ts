import { useState, useCallback } from 'react';
import {
    Answers,
    DifficultySignal,
    OverallMetrics,
    Question,
    Scenario,
    ScenarioResult,
    ScreenType,
} from '../types/quiz.types';
import { generateScenario as apiGenerateScenario, evaluateScenario as apiEvaluateScenario } from '../services/api';
import {
    calculateDynamicConfidence,
    calculatePerformanceScore,
    determineDifficultySignal,
    heuristicCognitiveFeatures,
} from '../utils/classifyLearner';

// Extract the reflection free-text answer (used for implicit confidence scoring)
function getReflectionText(answers: Answers, questions: Question[]): string {
    const reflectionQ = questions.find(q => q.type === 'reflection');
    if (!reflectionQ) return '';
    const raw = answers[reflectionQ.id];
    if (Array.isArray(raw)) return raw.join(' ');
    if (typeof raw === 'string') return raw.includes('|') ? raw.split('|').slice(1).join(' ') : raw;
    return '';
}

// ─── FALLBACK ────────────────────────────────────────────────────────────────
const getFallbackData = (): { scenario: Scenario; questions: Question[] } => ({
    scenario: {
        title: '📋 The Festival Budget Crisis',
        description:
            "You're the student council treasurer. You have Rs.50,000 in sponsorship but five clubs submitted proposals totalling Rs.75,000. The principal needs your allocation by 9 AM tomorrow.",
        context_details: '• Drama Club: Rs.20,000\n• Science Club: Rs.18,000\n• Sports Club: Rs.15,000\n• Art Club: Rs.12,000\n• Music Club: Rs.10,000',
        constraint: 'Total requested = Rs.75,000 — that is Rs.25,000 over your budget!',
        urgency: 'The principal needs your final breakdown by 9 AM tomorrow.',
        totalTimeLimit: 660,
    },
    questions: [
        { id: 1, phase: 1, phaseName: 'Understanding', type: 'text', timeLimit: 90, question: 'What is the core tension here? Why is this decision genuinely difficult beyond just the numbers?', hint: 'Think about fairness, relationships, and long-term impact.' },
        { id: 2, phase: 1, phaseName: 'Understanding', type: 'mcq', timeLimit: 60, question: 'What information would be MOST critical before deciding?', options: ['Each club\'s past event attendance', 'Which club president submitted first', 'Which club the principal likes', 'Number of members per club'] },
        { id: 3, phase: 2, phaseName: 'Planning', type: 'multi-text', timeLimit: 120, question: 'Propose THREE different strategies to bridge the Rs.25,000 gap.', hint: 'Think beyond equal cuts — phased payments, fundraising, merit-based allocation.' },
        { id: 4, phase: 2, phaseName: 'Planning', type: 'ranking', timeLimit: 90, question: 'Rank your three strategies. Which best balances fairness and practicality?', hint: 'Consider which avoids resentment while keeping the fest successful.' },
        { id: 5, phase: 3, phaseName: 'Execution', type: 'mcq-urgent', timeLimit: 45, urgentUpdate: '🚨 Drama Club found props at 40% discount — now needs only Rs.12,000!', question: 'You have 45 seconds. What do you do with the freed Rs.8,000?', options: ['Redistribute to underfunded clubs', 'Verify quality first, then redistribute', 'Keep original plan', 'Challenge all clubs to find savings'] },
        { id: 6, phase: 3, phaseName: 'Execution', type: 'text', timeLimit: 0, context: 'Music Club got only Rs.3,000. Their president is upset.', question: 'What would you actually say to the Music Club president?' },
        { id: 7, phase: 4, phaseName: 'Reflection', type: 'reflection', timeLimit: 0, question: 'Rate your confidence 1-10. What would you change if you could redo this?' },
    ],
});

// ─── HOOK ────────────────────────────────────────────────────────────────────
export function useQuizState() {
    const [screen, setScreen] = useState<ScreenType>('welcome');
    const [isLoading, setIsLoading] = useState(false);

    // Current iteration state
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});

    // Multi-iteration state
    const [currentScenarioNumber, setCurrentScenarioNumber] = useState(1);
    const [difficultyLevel, setDifficultyLevel] = useState(5);
    const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);

    // Student identity (for dashboards / persistence)
    const [studentName, setStudentName] = useState('');

    // Cost tracking
    const [tokensUsed, setTokensUsed] = useState(0);
    const [totalCost, setTotalCost] = useState(0);

    const totalQuestions = questions.length;
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    // ── Load scenario from API or fallback ────────────────────────────────────
    const loadScenario = useCallback(
        async (level: number, scenarioNum: number, signal?: DifficultySignal, previousThemes: string[] = []) => {
            setIsLoading(true);
            try {
                const data = await apiGenerateScenario(signal, scenarioNum, level, previousThemes);
                if (data.success) {
                    setScenario(data.scenario);
                    setQuestions(data.questions);
                    setTokensUsed(prev => prev + data.usage.tokens);
                    setTotalCost(prev => prev + data.usage.estimatedCost);
                    return true;
                }
                throw new Error(data.message || 'Generation failed');
            } catch (error) {
                console.error('Using fallback:', error);
                const fallback = getFallbackData();
                setScenario(fallback.scenario);
                setQuestions(fallback.questions);
                return false;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    // ── START (from welcome screen with chosen difficulty) ─────────────────────
    const startQuiz = useCallback(async (chosenDifficulty: number, name?: string) => {
        if (name !== undefined) setStudentName(name);
        setCurrentScenarioNumber(1);
        setDifficultyLevel(chosenDifficulty);
        setScenarioResults([]);
        setAnswers({});
        setCurrentQuestionIndex(0);
        await loadScenario(chosenDifficulty, 1);
        setScreen('quiz');
    }, [loadScenario]);

    // ── DASHBOARD NAVIGATION (Improvement #6) ──────────────────────────────────
    const showStudentDashboard = useCallback(() => setScreen('student-dashboard'), []);
    const showTeacherDashboard = useCallback(() => setScreen('teacher-dashboard'), []);
    const goToWelcome = useCallback(() => setScreen('welcome'), []);

    // ── COMPLETE ITERATION (saves results, shows inter-scenario) ──────────────
    const completeScenario = useCallback(
        async (overallMetrics: OverallMetrics) => {
            setIsLoading(true);
            const reflectionText = getReflectionText(answers, questions);
            try {
                // Fetch GPT evaluation for accuracy and cognitive features
                const evaluationData = await apiEvaluateScenario(scenario, questions, answers);

                if (evaluationData.success) {
                    setTokensUsed(prev => prev + evaluationData.usage.tokens);
                    setTotalCost(prev => prev + evaluationData.usage.estimatedCost);
                }

                const accuracyScore = evaluationData.success ? evaluationData.evaluation.accuracy_score : 0.5;
                // Hybrid pipeline: trust the LLM when it succeeds, otherwise fall
                // back to reliable client-side heuristics instead of flat 0.5s.
                const cognitiveFeatures = evaluationData.success
                    ? evaluationData.evaluation.cognitive_features
                    : heuristicCognitiveFeatures(answers, questions);

                // Implicit, behaviour-driven confidence (no self-report slider)
                const confidence = calculateDynamicConfidence(
                    overallMetrics,
                    difficultyLevel,
                    accuracyScore,
                    reflectionText
                );

                const perfScore = calculatePerformanceScore(overallMetrics, confidence, accuracyScore, difficultyLevel);

                const result: ScenarioResult = {
                    scenarioNumber: currentScenarioNumber,
                    scenarioTitle: scenario?.title || `Round ${currentScenarioNumber}`,
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
                    avgTimeToStart: overallMetrics.avgTimeToStart,
                    totalResponseLength: overallMetrics.totalResponseLength,
                    skippedQuestions: overallMetrics.skippedQuestions,
                    overtimeCount: overallMetrics.overtimeCount,
                    answers: { ...answers },
                };

                setScenarioResults(prev => [...prev, result]);
                setScreen('inter-scenario');
            } catch (error) {
                console.error("Failed to evaluate scenario:", error);
                // Fallback result if API fails — use client-side heuristics, not flat 0.5s
                const cognitiveFeatures = heuristicCognitiveFeatures(answers, questions);
                const accuracyScore = 0.5;
                const confidence = calculateDynamicConfidence(
                    overallMetrics,
                    difficultyLevel,
                    accuracyScore,
                    reflectionText
                );
                const result: ScenarioResult = {
                    scenarioNumber: currentScenarioNumber,
                    scenarioTitle: scenario?.title || `Round ${currentScenarioNumber}`,
                    difficultyLevel,
                    avgResponseTime: overallMetrics.avgResponseTime,
                    totalAnswerChanges: overallMetrics.totalAnswerChanges,
                    backtrackCount: overallMetrics.backtrackCount,
                    rushedDecisions: overallMetrics.rushedDecisions,
                    overthinkingCount: overallMetrics.overthinkingCount,
                    timeVariance: overallMetrics.timeVariance,
                    confidence,
                    decisionStyle: overallMetrics.decisionStyle,
                    performanceScore: calculatePerformanceScore(overallMetrics, confidence, accuracyScore, difficultyLevel),
                    accuracyScore,
                    cognitive: cognitiveFeatures,
                    avgTimeToStart: overallMetrics.avgTimeToStart,
                    totalResponseLength: overallMetrics.totalResponseLength,
                    skippedQuestions: overallMetrics.skippedQuestions,
                    overtimeCount: overallMetrics.overtimeCount,
                    answers: { ...answers },
                };
                setScenarioResults(prev => [...prev, result]);
                setScreen('inter-scenario');
            } finally {
                setIsLoading(false);
            }
        },
        [currentScenarioNumber, scenario, questions, difficultyLevel, answers]
    );

    // ── CONTINUE TO NEXT ROUND (user chose new difficulty) ────────────────────
    const proceedToNextScenario = useCallback(async (newDifficulty: number) => {
        const nextNum = currentScenarioNumber + 1;
        setDifficultyLevel(newDifficulty);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setCurrentScenarioNumber(nextNum);

        // Use adaptive signal based on last performance
        const lastResult = scenarioResults[scenarioResults.length - 1];
        const signal = lastResult
            ? determineDifficultySignal(
                  {
                      avgResponseTime: lastResult.avgResponseTime,
                      totalAnswerChanges: lastResult.totalAnswerChanges,
                      backtrackCount: lastResult.backtrackCount,
                      rushedDecisions: lastResult.rushedDecisions,
                      overthinkingCount: lastResult.overthinkingCount,
                      timeVariance: lastResult.timeVariance,
                      decisionStyle: lastResult.decisionStyle as any,
                  } as any,
                  lastResult.performanceScore
              )
            : undefined;

        const previousThemes = scenarioResults.map(r => r.scenarioTitle);

        await loadScenario(newDifficulty, nextNum, signal, previousThemes);
        setScreen('quiz');
    }, [currentScenarioNumber, loadScenario, scenarioResults]);

    // ── FINISH EARLY (user chose to stop) ─────────────────────────────────────
    const finishAssessment = useCallback(() => {
        setScreen('results');
    }, []);

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

    // Direct jump (Improvement #9) — used by the question navigation grid.
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
        setCurrentScenarioNumber(1);
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
        currentScenarioNumber,
        difficultyLevel,
        scenarioResults,
        studentName,
        tokensUsed,
        totalCost,

        startQuiz,
        completeScenario,
        proceedToNextScenario,
        finishAssessment,
        setAnswer,
        goToNextQuestion,
        goToPreviousQuestion,
        goToQuestion,
        restartQuiz,
        showStudentDashboard,
        showTeacherDashboard,
        goToWelcome,
        addCost,
    };
}
