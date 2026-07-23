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

export type QuestionType = 'text' | 'mcq' | 'mcq-urgent' | 'multi-text' | 'ranking' | 'reflection' | 'slider' | 'vark';

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
    // Slider specific properties
    min?: number;
    max?: number;
    unit?: string;
    // Answer-key & Question Bank fields
    correctAnswer?: string;
    accept?: string[];
    category?: string;
    keyPoints?: string[];
    // Inline SVG diagram for visual/aptitude questions
    svg?: string;
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

export type ScreenType =
    | 'welcome'
    | 'auth'
    | 'user-dashboard'
    | 'quiz'
    | 'custom-quiz'
    | 'inter-scenario'
    | 'results'
    | 'session-dashboard'
    | 'record-detail'
    | 'assessment-setup'
    | 'general-quiz'
    | 'general-results';

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

export interface ItemizedDetail {
    id: number;
    q: string;
    type: string;
    marks?: number;
    ans: string;
    correct?: string;
    isCorrect?: boolean;
    time?: number;
    revisions?: number;
}

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
    vark?: { visual: number; auditory: number; readWrite: number; kinesthetic: number };
    avgTimeToStart: number;
    totalResponseLength: number;
    skippedQuestions: number;
    overtimeCount: number;
    // General aptitude test marks (1 mark per question)
    marksObtained?: number;
    totalMarks?: number;
    perQuestionCorrect?: Record<number, boolean>;
    answers: Answers;
    questions?: Question[];
    itemizedDetails?: ItemizedDetail[];
    questionsMetrics?: Record<
        number,
        {
            totalTimeSpent: number;
            timeToFirstInteraction: number | null;
            answerChanges: number;
            responseLength: number;
        }
    >;
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

// ─── DYNAMIC ASSESSMENT MODES ─────────────────────────────────────────────────

export type AssessmentMode = 'ai-scenario' | 'custom-paper' | 'ai-material';

export type ExamDifficulty = 'easy' | 'normal' | 'hard';

// 'mcq' = multiple choice (auto-graded by key); 'short' = brief written answer;
// 'long' = extended/essay answer graded by number of valid points covered.
// 'short' and 'long' are both graded cumulatively by AI and feed the cognitive
// text evaluation.
export type CustomQuestionType = 'mcq' | 'short' | 'long';

export interface CustomExamQuestion {
    id: number;
    type: CustomQuestionType;
    marks: number;
    question: string;
    options: string[];        // empty array for written ('short'/'long') questions
    // Answer-key fields — present only in the server-side copy and in the graded
    // result returned AFTER submission. Stripped from the exam sent to the client
    // before the exam starts, so answers can never leak.
    correctAnswer?: string;   // MCQ letter (A–D)
    explanation?: string;
    keyPoints?: string[];     // model answer points for grading written questions
    // Cognitive-profiling probe: a marks-free written question auto-appended to
    // every custom exam so the 4 cognitive features can always be measured (even
    // for a pure-MCQ paper). Excluded from marks, correctness review and skip counts.
    probe?: boolean;
}

export interface ExamConfig {
    materialText: string;
    mcqCount: number;
    shortCount: number;
    longCount: number;
    totalMarks: number;
    difficulty: ExamDifficulty;
}

export interface GeneratedExam {
    examId?: string;          // server-side handle used for leak-free grading
    examTitle: string;
    totalMarks: number;
    questions: CustomExamQuestion[];
    // Overall exam timer (set by the creator). Drives the countdown while taking.
    durationSeconds?: number;
    // What happens when the timer hits zero:
    //  'auto-submit' → force-submit the exam;
    //  'soft'        → keep going into overtime (measured as extra behavioural data).
    timerMode?: 'auto-submit' | 'soft';
}

// Per-question grading detail returned by the server after submission.
export interface GradedQuestion {
    id: number;
    awardedMarks: number;
    correct?: boolean;        // MCQ only
    feedback?: string;        // written-answer AI feedback
    pointsCovered?: number;   // long-answer: valid points the student covered
    totalPoints?: number;     // long-answer: expected key points count
}

export interface ExamGradingResult {
    questions: CustomExamQuestion[];   // full questions WITH answer key (post-submit)
    graded: GradedQuestion[];
    obtainedMarks: number;
    totalMarks: number;
    mcqMarks: number;
    shortMarks: number;
    cognitive?: CognitiveFeatures;     // from cumulative AI text evaluation
}
