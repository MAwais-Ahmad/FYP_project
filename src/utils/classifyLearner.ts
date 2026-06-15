import {
    CategoryResult,
    CognitiveFeatures,
    DifficultySignal,
    LearnerCategoryId,
    OverallMetrics,
    ScenarioResult,
} from '../types/quiz.types';

// ─── CATEGORY METADATA (all 7 learner types) ─────────────────────────────────

export const LEARNER_CATEGORIES: Record<
    LearnerCategoryId,
    {
        name: string;
        emoji: string;
        prevalence: string;
        description: string;
        pattern: string[];
        solutionType: 'lacking' | 'excelling' | 'growth';
        youtubeTopics: string[];
        aiSessionTopics: string[];
        focusArea: string;
        color: string; // tailwind gradient classes
    }
> = {
    quick_careless: {
        name: 'Quick but Careless',
        emoji: '⚡',
        prevalence: '15–20%',
        description:
            'You make decisions quickly and confidently, but sometimes miss important details. Speed is your strength — accuracy is your growth area.',
        pattern: [
            'Fast decisions (avg < 30s per question)',
            'Low answer revisions',
            'Shallow reflection depth',
            'Higher rushed decision count',
        ],
        solutionType: 'lacking',
        youtubeTopics: [
            'Accuracy improvement techniques',
            '"Think before you answer" decision frameworks',
            'Slow thinking vs fast thinking (Daniel Kahneman)',
        ],
        aiSessionTopics: [
            'Timed accuracy drills with instant feedback',
            'Double-check practice exercises',
            'Error pattern analysis sessions',
        ],
        focusArea: 'Slow down and verify answers before submitting',
        color: 'from-amber-500 to-orange-500',
    },

    slow_thorough: {
        name: 'Slow but Thorough',
        emoji: '🐢',
        prevalence: '20–25%',
        description:
            'You think deeply before acting and rarely make careless mistakes. Working on speed will help you perform under time constraints without sacrificing quality.',
        pattern: [
            'Slow decisions (avg > 90s per question)',
            'Frequent answer revisions (rethinking)',
            'High reflection depth',
            'High overthinking count',
        ],
        solutionType: 'lacking',
        youtubeTopics: [
            'Speed reading and quick decision techniques',
            'Confidence building under pressure',
            'Trusting your gut instinct',
        ],
        aiSessionTopics: [
            'Timed challenge exercises (beat the clock)',
            '"Trust your first instinct" practice rounds',
            'Rapid-fire decision scenarios',
        ],
        focusArea: 'Build speed while maintaining your natural thoroughness',
        color: 'from-blue-500 to-cyan-500',
    },

    concept_struggler: {
        name: 'Concept Struggler',
        emoji: '😰',
        prevalence: '10–15%',
        description:
            'You are still building your foundation. With the right guided support, steady improvement is absolutely achievable. Everyone starts somewhere.',
        pattern: [
            'Slow decisions with low confidence (< 5/10)',
            'Flat learning curve across scenarios',
            'Frequent backtracking',
            'Low learning orientation score',
        ],
        solutionType: 'lacking',
        youtubeTopics: [
            'Foundational concept explanations with visuals',
            'Step-by-step problem solving guides',
            'How to break down complex decisions',
        ],
        aiSessionTopics: [
            'Guided practice with fully worked examples',
            'Basics review with real-world analogies',
            'Concept-building step-by-step sessions',
        ],
        focusArea: 'Master fundamentals before moving to complex problems',
        color: 'from-rose-500 to-pink-500',
    },

    fast_learner: {
        name: 'Fast Learner',
        emoji: '🚀',
        prevalence: '10–15%',
        description:
            'You adapt quickly, spot patterns fast, and consistently improve across scenarios. You are ready for advanced challenges and leadership roles.',
        pattern: [
            'Fast decisions with high confidence (≥ 8/10)',
            'Clear improvement from Scenario 1 to 2',
            'Speeding up over time',
            'Strong cognitive adaptation',
        ],
        solutionType: 'excelling',
        youtubeTopics: [
            'Advanced topic explorations and enrichment materials',
            'Real-world case study breakdowns',
            'Leadership and strategic thinking',
        ],
        aiSessionTopics: [
            'Complex multi-variable problem challenges',
            'Teaching and mentorship simulation exercises',
            'Leadership decision-making scenarios',
        ],
        focusArea: 'Stay engaged with harder problems and mentorship opportunities',
        color: 'from-emerald-500 to-teal-500',
    },

    inconsistent_performer: {
        name: 'Inconsistent Performer',
        emoji: '🎲',
        prevalence: '15–20%',
        description:
            'Your performance swings between excellent and poor. This often points to anxiety or focus issues, not lack of ability. Consistency practice will unlock your true potential.',
        pattern: [
            'High time variance (sometimes fast, sometimes very slow)',
            'Erratic accuracy patterns',
            'High backtrack frequency',
            'High answer change count',
        ],
        solutionType: 'lacking',
        youtubeTopics: [
            'Stress management for students',
            'Test anxiety reduction techniques',
            'Focus and concentration exercises',
        ],
        aiSessionTopics: [
            'Consistent routine practice sessions',
            'Mindfulness and calm decision-making exercises',
            'Pressure simulation with reflection',
        ],
        focusArea: 'Build stable performance through regular structured practice',
        color: 'from-purple-500 to-violet-500',
    },

    steady_achiever: {
        name: 'Steady Achiever',
        emoji: '📊',
        prevalence: '15–20%',
        description:
            'You are reliable and consistent. Your steady approach is a genuine strength — now it is time to push your limits and break through to the next level.',
        pattern: [
            'Consistent timing (45–80s per question)',
            'Moderate confidence (6–8/10)',
            'Gradual improvement across scenarios',
            'Low time variance',
        ],
        solutionType: 'growth',
        youtubeTopics: [
            'Goal-setting techniques for students',
            'Breaking performance plateaus',
            'Incremental challenge strategies',
        ],
        aiSessionTopics: [
            'Stretch exercises beyond your comfort zone',
            'Skill progression challenges with increasing difficulty',
            'Harder problem variations of familiar scenarios',
        ],
        focusArea: 'Gradually increase difficulty to reach the next performance level',
        color: 'from-sky-500 to-indigo-500',
    },

    strategic_thinker: {
        name: 'Strategic Thinker',
        emoji: '🧠',
        prevalence: '5–10%',
        description:
            'You see the big picture, approach problems creatively, and think holistically. Your strategic mindset is rare and highly valuable. Lead, mentor, and take on complex challenges.',
        pattern: [
            'Medium timing (thinks before acting, 40–90s)',
            'High creativity and self-awareness scores',
            'Holistic big-picture approach',
            'Deep reflections',
        ],
        solutionType: 'excelling',
        youtubeTopics: [
            'Creative problem-solving frameworks',
            'Systems thinking and mental models',
            'Leadership development and executive decision-making',
        ],
        aiSessionTopics: [
            'Multi-step complex real-world problems',
            'Strategic planning challenges',
            'Team leadership and conflict resolution simulations',
        ],
        focusArea: 'Take on leadership roles, mentor others, and tackle ambitious projects',
        color: 'from-fuchsia-500 to-purple-500',
    },

    ignorant_avoider: {
        name: 'Ignorant / Avoider',
        emoji: '🙈',
        prevalence: '< 5%',
        description:
            'You tend to skip questions or let the timer run out without attempting an answer. Avoiding challenges prevents growth—start taking small risks!',
        pattern: [
            'Skipping questions rapidly',
            'Letting the timer expire without answering',
            'Very low accuracy and engagement',
            'Zero or minimal reflection',
        ],
        solutionType: 'lacking',
        youtubeTopics: [
            '"The Cost of Doing Nothing" (Documentary/Case Study)',
            'Why ignoring problems makes them exponentially worse',
            'Funny compilation: When procrastinating goes completely wrong',
        ],
        aiSessionTopics: [
            'Low-stakes "guess the answer" games',
            'Building confidence through easy wins',
            'Time management: breaking paralysis',
        ],
        focusArea: 'Attempt every question, even if you are unsure',
        color: 'from-gray-500 to-slate-700',
    },
};

// ─── SCORING ENGINE ───────────────────────────────────────────────────────────

interface ClassificationInput {
    overall: OverallMetrics;
    cognitive: CognitiveFeatures;
    scenarioResults: ScenarioResult[];
    confidence: number;
    accuracyScore: number;
}

function scoreCategory(id: LearnerCategoryId, input: ClassificationInput): number {
    const { overall, cognitive, scenarioResults, confidence, accuracyScore } = input;
    const avgTime = overall.avgResponseTime;
    const variance = parseFloat(overall.timeVariance as string) || 0;
    const answerChanges = overall.totalAnswerChanges;
    const backtrack = overall.backtrackCount;

    // Learning improvement rate across scenarios
    const improvementRate =
        scenarioResults.length > 1
            ? scenarioResults[scenarioResults.length - 1].performanceScore -
              scenarioResults[0].performanceScore
            : 0;

    // ANTI-CHEAT GATEKEEPER
    // If they skipped everything really fast or just let the timer run out on everything
    const isSkippingBehavior = (accuracyScore < 0.25 && avgTime < 20 && overall.questionsAnswered < 4) || overall.skippedQuestions >= 3;
    const skipped = overall.skippedQuestions;
    const overtime = overall.overtimeCount;

    switch (id) {
        case 'ignorant_avoider': {
            if (isSkippingBehavior) return 1.0;
            let s = 0;
            if (skipped >= 3) s += 0.5;
            else if (skipped >= 1) s += 0.2;
            
            // If they let timer run out and didn't answer
            if (overtime >= 2 && accuracyScore < 0.2) s += 0.4;
            
            if (overall.questionsAnswered < 3) s += 0.3;
            if (accuracyScore < 0.3) s += 0.2;
            
            return Math.min(s, 1);
        }

        case 'quick_careless': {
            let s = 0;
            // They are careless, but not completely ignorant (which is caught above)
            if (isSkippingBehavior) return 0;

            if (avgTime < 25) s += 0.3;
            else if (avgTime < 35) s += 0.2;
            else if (avgTime < 45) s += 0.1;
            
            if (overall.avgTimeToStart < 2) s += 0.15; // Started clicking instantly
            if (overall.decisionStyle === 'impulsive') s += 0.1;

            if (confidence < 6) s += 0.1;
            if (accuracyScore < 0.5) s += 0.2;
            if (answerChanges < 2) s += 0.1;
            if (skipped >= 2) s += 0.15; // Skipped questions = careless
            if (cognitive.reflection_depth < 0.45) s += 0.1;
            if (overall.rushedDecisions > 2) s += 0.1;
            return Math.min(s, 1);
        }

        case 'slow_thorough': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (avgTime > 100) s += 0.3;
            else if (avgTime > 80) s += 0.2;
            else if (avgTime > 65) s += 0.1;

            if (overall.avgTimeToStart > 8) s += 0.1; // Read carefully first
            if (overall.decisionStyle === 'deliberate') s += 0.1;

            if (confidence >= 7) s += 0.15;
            if (answerChanges >= 4) s += 0.15;
            else if (answerChanges >= 2) s += 0.1;
            if (cognitive.reflection_depth > 0.65) s += 0.15;
            if (overall.overthinkingCount > 1) s += 0.1;
            if (overtime >= 2) s += 0.1; // Going overtime = thorough
            if (skipped === 0) s += 0.05; // Answered everything
            return Math.min(s, 1);
        }

        case 'concept_struggler': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (avgTime > 90) s += 0.15;
            if (accuracyScore < 0.4) s += 0.35;
            if (confidence < 5) s += 0.25;
            else if (confidence < 6) s += 0.15;
            if (improvementRate < 0.05) s += 0.2;
            if (cognitive.learning_orientation < 0.4) s += 0.15;
            if (skipped >= 2) s += 0.1; // Skipping = struggling
            if (overtime >= 3) s += 0.1; // Went overtime on many questions
            if (backtrack > 3 && answerChanges > 3) s += 0.05;
            return Math.min(s, 1);
        }

        case 'fast_learner': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (avgTime < 35) s += 0.2;
            else if (avgTime < 45) s += 0.1;

            if (accuracyScore > 0.7) s += 0.25;
            if (overall.totalResponseLength > 30) s += 0.1; // Actually typed answers
            
            if (confidence >= 9) s += 0.15;
            else if (confidence >= 8) s += 0.1;

            if (overall.timeTrend === 'speeding_up') s += 0.15;
            if (improvementRate > 0.2) s += 0.2;
            else if (improvementRate > 0.1) s += 0.1;
            if (skipped === 0) s += 0.05; // Answered everything
            if (overtime === 0) s += 0.05; // Never went overtime
            return Math.min(s, 1);
        }

        case 'inconsistent_performer': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (variance > 0.65) s += 0.45;
            else if (variance > 0.45) s += 0.25;
            else if (variance > 0.3) s += 0.1;
            if (backtrack > 4) s += 0.2;
            else if (backtrack > 2) s += 0.1;
            if (answerChanges > 6) s += 0.2;
            else if (answerChanges > 4) s += 0.1;
            if (overall.rushedDecisions > 2 && overall.overthinkingCount > 1) s += 0.1;
            if (skipped >= 1 && overtime >= 1) s += 0.1; // Mix of skipping AND overtime = inconsistent
            return Math.min(s, 1);
        }

        case 'steady_achiever': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (variance < 0.25) s += 0.35;
            else if (variance < 0.35) s += 0.2;
            if (confidence >= 6 && confidence <= 8) s += 0.2;
            if (overall.timeTrend === 'stable') s += 0.25;
            if (avgTime >= 45 && avgTime <= 80) s += 0.15;
            if (skipped === 0) s += 0.05; // Answered everything
            if (overtime <= 1) s += 0.05; // Mostly within time
            return Math.min(s, 1);
        }

        case 'strategic_thinker': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (cognitive.creativity_score > 0.75) s += 0.25;
            else if (cognitive.creativity_score > 0.6) s += 0.15;
            
            if (cognitive.reflection_depth > 0.75) s += 0.25;
            else if (cognitive.reflection_depth > 0.6) s += 0.15;
            
            if (overall.totalResponseLength > 50) s += 0.1; // Very thorough answers
            if (overall.decisionStyle === 'deliberate') s += 0.1;

            if (avgTime >= 40 && avgTime <= 90) s += 0.15;
            if (cognitive.self_awareness > 0.7) s += 0.2;
            else if (cognitive.self_awareness > 0.55) s += 0.1;
            return Math.min(s, 1);
        }

        default:
            return 0;
    }
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Classify a student into one (or a blend) of the 7 learner categories.
 */
export function classifyLearner(input: ClassificationInput): CategoryResult {
    const ids: LearnerCategoryId[] = [
        'quick_careless',
        'slow_thorough',
        'concept_struggler',
        'fast_learner',
        'inconsistent_performer',
        'steady_achiever',
        'strategic_thinker',
        'ignorant_avoider',
    ];

    const scored = ids
        .map(id => ({ id, score: scoreCategory(id, input) }))
        .sort((a, b) => b.score - a.score);

    const primary = scored[0];
    const secondary = scored[1];

    // Normalize to percentages
    const totalScore = scored.reduce((sum, s) => sum + s.score, 0) || 1;
    const primaryConf = Math.round((primary.score / totalScore) * 100) / 100;
    const secondaryConf = Math.round((secondary.score / totalScore) * 100) / 100;

    // Category blend if secondary is strong relative to primary
    const categoryBlend =
        secondary.score > 0.35 && secondary.score >= primary.score * 0.55;

    const pm = LEARNER_CATEGORIES[primary.id];
    const sm = LEARNER_CATEGORIES[secondary.id];

    return {
        primary_category: primary.id,
        primary_name: pm.name,
        primary_emoji: pm.emoji,
        primary_confidence: primaryConf,
        secondary_category: categoryBlend ? secondary.id : undefined,
        secondary_name: categoryBlend ? sm.name : undefined,
        secondary_emoji: categoryBlend ? sm.emoji : undefined,
        secondary_confidence: categoryBlend ? secondaryConf : undefined,
        category_blend: categoryBlend,
    };
}

/**
 * Calculate a normalized 0–1 performance score for a scenario.
 * Higher = better performance overall.
 */
export function calculatePerformanceScore(
    overall: OverallMetrics,
    confidence: number,
    accuracyScore: number
): number {
    // Accuracy: 40%
    const accScore = accuracyScore * 0.4;

    // Confidence: 10%
    const confScore = (confidence / 10) * 0.1;

    // Speed balance: 20% — medium speed (60s) is ideal; too fast or too slow reduces score
    const idealTime = 60;
    const speedScore =
        Math.max(0, 1 - Math.abs(overall.avgResponseTime - idealTime) / 120) * 0.2;

    // Consistency: 20% — lower variance = better
    const consistencyScore =
        Math.max(0, 1 - parseFloat(overall.timeVariance as string)) * 0.2;

    // Engagement: 10% — some answer changes are good (1–4), none or too many are bad
    const changes = overall.totalAnswerChanges;
    const engagementScore =
        (changes >= 1 && changes <= 4 ? 0.9 : changes === 0 ? 0.45 : 0.25) * 0.1;

    return Math.min(Math.max(accScore + confScore + speedScore + consistencyScore + engagementScore, 0), 1);
}

/**
 * Determine what difficulty the next scenario should be.
 */
export function determineDifficultySignal(
    overall: OverallMetrics,
    performanceScore: number
): DifficultySignal {
    if (performanceScore > 0.68 && overall.decisionStyle !== 'impulsive') {
        return 'harder';
    }
    if (performanceScore < 0.35 || overall.decisionStyle === 'impulsive') {
        return 'easier';
    }
    return 'consistency_test';
}
