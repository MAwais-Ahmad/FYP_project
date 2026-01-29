import { useState, useCallback, useRef } from 'react';
import { Metrics, QuestionMetrics, OverallMetrics } from '../types/quiz.types';

const createEmptyQuestionMetrics = (): QuestionMetrics => ({
    questionShownAt: null,
    firstInteractionAt: null,
    timeToFirstInteraction: null,
    totalTimeSpent: 0,
    answerChanges: 0,
    finalAnswer: null,
    responseLength: 0,
    timeLimit: 0,
    usedTime: 0,
    phase: null,
});

export function useMetrics() {
    const [metrics, setMetrics] = useState<Metrics>({
        totalTime: 0,
        questions: {},
        backtrackCount: 0,
    });

    const quizStartTime = useRef<number | null>(null);

    const startQuiz = useCallback(() => {
        quizStartTime.current = Date.now();
    }, []);

    const initQuestionMetrics = useCallback((questionId: number) => {
        setMetrics(prev => {
            if (prev.questions[questionId]) return prev;
            return {
                ...prev,
                questions: {
                    ...prev.questions,
                    [questionId]: createEmptyQuestionMetrics(),
                },
            };
        });
    }, []);

    const recordQuestionStart = useCallback((questionId: number, timeLimit: number, phase: number) => {
        setMetrics(prev => ({
            ...prev,
            questions: {
                ...prev.questions,
                [questionId]: {
                    ...(prev.questions[questionId] || createEmptyQuestionMetrics()),
                    questionShownAt: Date.now(),
                    timeLimit,
                    phase,
                },
            },
        }));
    }, []);

    const recordFirstInteraction = useCallback((questionId: number) => {
        setMetrics(prev => {
            const q = prev.questions[questionId];
            if (!q || q.firstInteractionAt) return prev;

            const now = Date.now();
            return {
                ...prev,
                questions: {
                    ...prev.questions,
                    [questionId]: {
                        ...q,
                        firstInteractionAt: now,
                        timeToFirstInteraction: q.questionShownAt
                            ? (now - q.questionShownAt) / 1000
                            : null,
                    },
                },
            };
        });
    }, []);

    const recordAnswerChange = useCallback((questionId: number) => {
        setMetrics(prev => {
            const q = prev.questions[questionId];
            if (!q) return prev;

            return {
                ...prev,
                questions: {
                    ...prev.questions,
                    [questionId]: {
                        ...q,
                        answerChanges: q.answerChanges + 1,
                    },
                },
            };
        });
    }, []);

    const recordQuestionEnd = useCallback((questionId: number) => {
        setMetrics(prev => {
            const q = prev.questions[questionId];
            if (!q || !q.questionShownAt) return prev;

            const totalTimeSpent = (Date.now() - q.questionShownAt) / 1000;
            return {
                ...prev,
                questions: {
                    ...prev.questions,
                    [questionId]: {
                        ...q,
                        totalTimeSpent,
                        usedTime: q.timeLimit > 0 ? Math.min(totalTimeSpent, q.timeLimit) : totalTimeSpent,
                    },
                },
            };
        });
    }, []);

    const recordFinalAnswer = useCallback((questionId: number, answer: string | string[], length: number) => {
        setMetrics(prev => {
            const q = prev.questions[questionId];
            if (!q) return prev;

            return {
                ...prev,
                questions: {
                    ...prev.questions,
                    [questionId]: {
                        ...q,
                        finalAnswer: answer,
                        responseLength: length,
                    },
                },
            };
        });
    }, []);

    const recordBacktrack = useCallback(() => {
        setMetrics(prev => ({
            ...prev,
            backtrackCount: prev.backtrackCount + 1,
        }));
    }, []);

    const calculateOverallMetrics = useCallback((): OverallMetrics => {
        const totalTime = quizStartTime.current ? (Date.now() - quizStartTime.current) / 1000 : 0;

        let totalResponseTime = 0;
        let questionsWithTime = 0;
        let totalAnswerChanges = 0;
        const timesToStart: number[] = [];
        const responseTimes: number[] = [];
        let rushedDecisions = 0;
        let overthinkingCount = 0;
        let totalResponseLength = 0;

        Object.values(metrics.questions).forEach(q => {
            if (q.totalTimeSpent) {
                totalResponseTime += q.totalTimeSpent;
                responseTimes.push(q.totalTimeSpent);
                questionsWithTime++;

                if (q.totalTimeSpent < 10) rushedDecisions++;
                if (q.totalTimeSpent > 120) overthinkingCount++;
            }
            totalAnswerChanges += q.answerChanges || 0;
            totalResponseLength += q.responseLength || 0;
            if (q.timeToFirstInteraction) {
                timesToStart.push(q.timeToFirstInteraction);
            }
        });

        const avgTimeToStart = timesToStart.length > 0
            ? timesToStart.reduce((a, b) => a + b, 0) / timesToStart.length
            : 0;
        const avgResponseTime = questionsWithTime > 0
            ? totalResponseTime / questionsWithTime
            : 0;

        let timeVariance = 0;
        if (responseTimes.length > 1) {
            const mean = avgResponseTime;
            const squaredDiffs = responseTimes.map(t => Math.pow(t - mean, 2));
            timeVariance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / responseTimes.length);
        }

        const normalizedVariance = Math.min(timeVariance / 60, 1);

        const calculateTimeTrend = (): 'speeding_up' | 'slowing_down' | 'stable' => {
            if (responseTimes.length < 3) return 'stable';
            const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
            const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

            if (secondAvg < firstAvg * 0.8) return 'speeding_up';
            if (secondAvg > firstAvg * 1.2) return 'slowing_down';
            return 'stable';
        };

        return {
            totalTime,
            avgResponseTime,
            avgTimeToStart,
            timeVariance: normalizedVariance.toFixed(2),
            rushedDecisions,
            overthinkingCount,
            totalAnswerChanges,
            backtrackCount: metrics.backtrackCount,
            questionsAnswered: Object.keys(metrics.questions).length,
            totalResponseLength,
            timeTrend: calculateTimeTrend(),
            decisionStyle: rushedDecisions > 2 ? 'impulsive' : (overthinkingCount > 2 ? 'deliberate' : 'balanced'),
        };
    }, [metrics]);

    const resetMetrics = useCallback(() => {
        quizStartTime.current = null;
        setMetrics({
            totalTime: 0,
            questions: {},
            backtrackCount: 0,
        });
    }, []);

    return {
        metrics,
        startQuiz,
        initQuestionMetrics,
        recordQuestionStart,
        recordFirstInteraction,
        recordAnswerChange,
        recordQuestionEnd,
        recordFinalAnswer,
        recordBacktrack,
        calculateOverallMetrics,
        resetMetrics,
    };
}
