// Quiz Types

export interface Stakeholder {
    name: string;
    request: string;
    purpose: string;
}

export interface Scenario {
    title: string;
    description: string;
    budget: string;
    stakeholders: Stakeholder[];
    constraint: string;
    urgency: string;
}

export type QuestionType = 'text' | 'mcq' | 'mcq-urgent' | 'multi-text' | 'ranking' | 'reflection';

export interface Question {
    id: number;
    phase: number;
    phaseName: string;
    type: QuestionType;
    timeLimit: number;
    question: string;
    hint?: string;
    options?: string[];
    context?: string;
    urgentUpdate?: string;
}

export interface QuestionMetrics {
    questionShownAt: number | null;
    firstInteractionAt: number | null;
    timeToFirstInteraction: number | null;
    totalTimeSpent: number;
    answerChanges: number;
    finalAnswer: string | string[] | null;
    responseLength: number;
    timeLimit: number;
    usedTime: number;
    phase: number | null;
}

export interface Metrics {
    totalTime: number;
    questions: Record<number, QuestionMetrics>;
    backtrackCount: number;
}

export interface OverallMetrics {
    totalTime: number;
    avgResponseTime: number;
    avgTimeToStart: number;
    timeVariance: string;
    rushedDecisions: number;
    overthinkingCount: number;
    totalAnswerChanges: number;
    backtrackCount: number;
    questionsAnswered: number;
    totalResponseLength: number;
    timeTrend: 'speeding_up' | 'slowing_down' | 'stable';
    decisionStyle: 'impulsive' | 'deliberate' | 'balanced';
}

export interface CognitiveFeatures {
    reflection_depth: number;
    self_awareness: number;
    learning_orientation: number;
    creativity_score: number;
    insights: string[];
}

export interface Answers {
    [questionId: number]: string | string[];
}

export type ScreenType = 'welcome' | 'quiz' | 'results';
