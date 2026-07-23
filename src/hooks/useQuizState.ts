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
    blendCognitiveWithBehavior,
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
        totalTimeLimit: 510,
    },
    questions: [
        { id: 1, phase: 1, phaseName: 'Information Filtering', type: 'mcq', timeLimit: 45, question: 'Which piece of information is most critical to verify first?', options: ['The total sponsorship amount', 'The detailed breakdown of Drama Club\'s request', 'The principal\'s hard deadline', 'Whether any clubs can share resources'] },
        { id: 2, phase: 2, phaseName: 'Information Filtering', type: 'mcq', timeLimit: 45, question: 'Sports club says they need Rs.15,000 for a tournament. What do you check?', options: ['Their previous year\'s expenditure', 'How many students are participating', 'If the tournament is an official university event', 'Can they get external sponsors'] },
        { id: 3, phase: 3, phaseName: 'Resource Allocation', type: 'slider', timeLimit: 60, question: 'Allocate a budget for the Drama Club. They asked for Rs.20,000.', min: 0, max: 20000, unit: 'Rs.' },
        { id: 4, phase: 4, phaseName: 'Resource Allocation', type: 'slider', timeLimit: 60, question: 'Allocate a budget for the Science Club. They asked for Rs.18,000.', min: 0, max: 18000, unit: 'Rs.' },
        { id: 5, phase: 5, phaseName: 'Planning', type: 'ranking', timeLimit: 90, question: 'Rank these budget cut strategies from most fair to least fair.', hint: 'Consider the impact on the student body.', options: ['Cut everyone proportionally', 'Cut the largest requests the most', 'Prioritize academic clubs over entertainment', 'Ask clubs to fundraise the difference'] },
        { id: 6, phase: 6, phaseName: 'Planning', type: 'ranking', timeLimit: 90, question: 'Rank these communication strategies for delivering the bad news.', options: ['Send a formal email to all presidents', 'Call an emergency in-person meeting', 'Tell the principal to announce it', 'Message them individually on WhatsApp'] },
        { id: 7, phase: 7, phaseName: 'Risk Mitigation', type: 'mcq', timeLimit: 60, question: 'If you cut Music Club to Rs.10,000, what is the biggest risk?', options: ['They cancel their headline performance', 'They complain to the faculty advisor', 'They overspend anyway and send you the bill', 'They refuse to participate next year'] },
        { id: 8, phase: 8, phaseName: 'Risk Mitigation', type: 'mcq', timeLimit: 60, question: 'What is your backup plan if the Rs.50,000 sponsorship is delayed by a week?', options: ['Borrow from the university emergency fund', 'Ask vendors for a credit extension', 'Cancel the festival', 'Ask students to pay an entry fee'] },
        { id: 9, phase: 9, phaseName: 'Execution Twist', type: 'mcq-urgent', timeLimit: 30, urgentUpdate: '🚨 The primary sponsor just pulled out! Budget is now Rs.30,000!', question: 'You have 30 seconds. What is your immediate action?', options: ['Cancel the festival immediately', 'Halt all club spending and call a meeting', 'Distribute the 30k equally right now', 'Go to the principal for university funds'] },
        { id: 10, phase: 10, phaseName: 'Execution Twist', type: 'mcq-urgent', timeLimit: 30, urgentUpdate: '🚨 Drama Club threatens to boycott if they don\'t get their full Rs.20k!', question: 'How do you respond?', options: ['Give them the money to save the fest', 'Let them boycott', 'Offer them Rs.15k as a final offer', 'Report them to the disciplinary committee'] },
        { id: 11, phase: 11, phaseName: 'Ethical Dilemma', type: 'mcq', timeLimit: 60, question: 'The Art Club president is your close friend. Do you secretly tell them about the cuts first?', options: ['Yes, they deserve a heads up', 'No, that is favoritism', 'Hint at it but don\'t give numbers', 'Tell them, but swear them to secrecy'] },
        { id: 12, phase: 12, phaseName: 'Ethical Dilemma', type: 'mcq', timeLimit: 60, question: 'A vendor offers you a 10% kickback if you allocate the budget to clubs that use them. Do you accept?', options: ['Yes, and use the kickback for the fest', 'No, that is corruption', 'Yes, and keep it', 'Report the vendor to the university'] },
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

    // Session mode: taking a host-authored single scenario. When true, completing
    // the scenario goes straight to results (no multi-round inter-scenario step).
    const [sessionMode, setSessionMode] = useState(false);

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
        setSessionMode(false);
        setCurrentScenarioNumber(1);
        setDifficultyLevel(chosenDifficulty);
        setScenarioResults([]);
        setAnswers({});
        setCurrentQuestionIndex(0);
        await loadScenario(chosenDifficulty, 1);
        setScreen('quiz');
    }, [loadScenario]);

    // ── START A PRESET SCENARIO (host-authored session paper) ──────────────────
    // Loads a fixed scenario every participant shares — single round, no generation.
    const startPresetScenario = useCallback(
        (presetScenario: Scenario, presetQuestions: Question[], level: number, name?: string) => {
            if (name !== undefined) setStudentName(name);
            setSessionMode(true);
            setCurrentScenarioNumber(1);
            setDifficultyLevel(level || 5);
            setScenarioResults([]);
            setAnswers({});
            setCurrentQuestionIndex(0);
            setScenario(presetScenario);
            setQuestions(presetQuestions);
            setScreen('quiz');
        },
        []
    );

    // ── DASHBOARD NAVIGATION ──────────────────────────────────────────────────
    const goToWelcome = useCallback(() => setScreen('welcome'), []);

    // ── COMPLETE ITERATION (saves results, shows inter-scenario) ──────────────
    const completeScenario = useCallback(
        async (overallMetrics: OverallMetrics, qMetrics?: any) => {
            if (isLoading) return;
            setIsLoading(true);
            const reflectionText = getReflectionText(answers, questions);
            try {
                // Fetch GPT evaluation for accuracy and cognitive features
                const evaluationData = await apiEvaluateScenario(scenario, questions, answers, studentName);


                if (evaluationData.success) {
                    setTokensUsed(prev => prev + evaluationData.usage.tokens);
                    setTotalCost(prev => prev + evaluationData.usage.estimatedCost);
                }

                const accuracyScore = evaluationData.success ? evaluationData.evaluation.accuracy_score : 0.5;
                // Hybrid pipeline: trust the LLM when it succeeds, otherwise fall
                // back to reliable client-side heuristics instead of flat 0.5s.
                // Tri-Factor: blend the LLM's Language scores with Behaviour +
                // Decision Dynamics so a strong write-up is confirmed by real behaviour.
                const cognitiveFeatures = evaluationData.success
                    ? blendCognitiveWithBehavior(evaluationData.evaluation.cognitive_features, overallMetrics)
                    : heuristicCognitiveFeatures(answers, questions, overallMetrics);

                // Implicit, behaviour-driven confidence (no self-report slider)
                const confidence = calculateDynamicConfidence(
                    overallMetrics,
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
                    questions: [...questions],
                    questionsMetrics: qMetrics ? { ...qMetrics } : undefined,
                    itemizedDetails: questions.map(q => {
                        const given = answers[q.id];
                        const isMcq = q.type === 'mcq';
                        let isCorrect: boolean | undefined = undefined;
                        if (isMcq && given != null && q.correctAnswer) {
                            isCorrect = String(given).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();
                        }
                        return {
                            id: q.id,
                            q: q.question,
                            type: q.type,
                            ans: given != null ? (Array.isArray(given) ? given.join(' | ') : String(given)) : '[No Answer]',
                            correct: q.correctAnswer || (Array.isArray(q.keyPoints) ? q.keyPoints.join(', ') : undefined),
                            isCorrect,
                            time: qMetrics?.[q.id]?.totalTimeSpent || 0,
                            revisions: qMetrics?.[q.id]?.answerChanges || 0,
                        };
                    }),
                };

                setScenarioResults(prev => [...prev, result]);
                setScreen(sessionMode ? 'results' : 'inter-scenario');
            } catch (error) {
                console.error("Failed to evaluate scenario:", error);
                // Fallback result if API fails — use client-side heuristics, not flat 0.5s
                const cognitiveFeatures = heuristicCognitiveFeatures(answers, questions, overallMetrics);
                const accuracyScore = 0.5;
                const confidence = calculateDynamicConfidence(
                    overallMetrics,
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
                    questions: [...questions],
                    questionsMetrics: qMetrics ? { ...qMetrics } : undefined,
                };
                setScenarioResults(prev => [...prev, result]);
                setScreen(sessionMode ? 'results' : 'inter-scenario');
            } finally {
                setIsLoading(false);
            }
        },
        [currentScenarioNumber, scenario, questions, difficultyLevel, answers, isLoading, sessionMode]
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
        setSessionMode(false);
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
        startPresetScenario,
        completeScenario,
        proceedToNextScenario,
        finishAssessment,
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
