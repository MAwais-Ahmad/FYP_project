// Quiz Types

export interface Stakeholder {
    name: string;
    request: string;
    purpose: string;
}

export interface Scenario {
    title: string;
    description: string;
    // Budget-allocation format
    budget?: string;
    stakeholders?: Stakeholder[];
    // All formats
    context_details?: string;
    constraint: string;
    urgency: string;
    totalTimeLimit?: number;
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
    overtimeSeconds: number;
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
    skippedQuestions: number;
    overtimeCount: number;
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

// ─── MULTI-SCENARIO + ML CLASSIFICATION TYPES ────────────────────────────────

export type ScreenType = 'welcome' | 'quiz' | 'inter-scenario' | 'results';

export type DifficultySignal = 'harder' | 'easier' | 'consistency_test';

export type LearnerCategoryId =
    | 'quick_careless'
    | 'slow_thorough'
    | 'concept_struggler'
    | 'fast_learner'
    | 'inconsistent_performer'
    | 'steady_achiever'
    | 'strategic_thinker'
    | 'ignorant_avoider';

export interface ScenarioResult {
    scenarioNumber: number;
    scenarioTitle: string;
    difficultyLevel: number;
    avgResponseTime: number;
    totalAnswerChanges: number;
    backtrackCount: number;
    rushedDecisions: number;
    overthinkingCount: number;
    timeVariance: string;
    confidence: number;
    decisionStyle: string;
    performanceScore: number;
    accuracyScore: number;
    cognitive: CognitiveFeatures;
    avgTimeToStart: number;
    totalResponseLength: number;
    skippedQuestions: number;
    overtimeCount: number;
    answers: Answers;
}

export interface CategoryResult {
    primary_category: LearnerCategoryId;
    primary_name: string;
    primary_emoji: string;
    primary_confidence: number;
    secondary_category?: LearnerCategoryId;
    secondary_name?: string;
    secondary_emoji?: string;
    secondary_confidence?: number;
    category_blend: boolean;
}
