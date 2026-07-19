import {
    Answers,
    CategoryResult,
    CognitiveFeatures,
    DifficultySignal,
    LearnerCategoryId,
    OverallMetrics,
    Question,
    ScenarioResult,
} from '../types/quiz.types';

// ─── CATEGORY METADATA (all 8 learner types) ─────────────────────────────────

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

// ─── ANTI-GAMING + DYNAMIC CONFIDENCE (Improvement #3) ────────────────────────

/**
 * Detect "gaming"/avoidant behaviour: skipping questions, blank answers, or
 * blasting through the whole round without reading. Shared by the classifier
 * (forces `ignorant_avoider`) and the dynamic-confidence engine (forces 0).
 */
export function detectSkippingBehavior(
    overall: OverallMetrics,
    accuracyScore: number
): boolean {
    const rushedThrough =
        accuracyScore < 0.25 &&
        overall.avgResponseTime < 20 &&
        overall.questionsAnswered < 4;
    const tooManySkips = overall.skippedQuestions >= 2;
    return rushedThrough || tooManySkips;
}

export function calculateDynamicConfidence(
    overall: OverallMetrics,
    accuracyScore: number,
    reflectionText: string
): number {
    if (detectSkippingBehavior(overall, accuracyScore)) return 0;

    let pts = 6.0; // Higher baseline to prevent overly low confidence for valid attempts

    // 1. Time pacing check
    const avgTime = overall.avgResponseTime;
    if (avgTime >= 30 && avgTime <= 80) {
        pts += 1.0; // Balanced pace shows steady processing
    } else if (avgTime < 20) {
        pts -= 0.5; // Rushing shows impulsive behavior
    } else if (avgTime > 90) {
        pts -= 0.5; // Slow decision making indicates hesitation
    }

    // Overtime count penalty is more gradual
    if (overall.overtimeCount > 0) {
        pts -= Math.min(overall.overtimeCount * 0.3, 1.5);
    } else if (overall.rushedDecisions === 0) {
        pts += 1.0; // Finished within limits, no rushing
    }

    // 2. Hesitation / Revisions (Gradual mapping)
    if (overall.backtrackCount <= 1) {
        pts += 0.5; // Straight path shows confidence
    } else if (overall.backtrackCount > 3) {
        pts -= 1.0;
    }

    const changes = overall.totalAnswerChanges;
    if (changes <= 4) {
        pts += 0.5; // Healthy adjustments
    } else if (changes > 8) {
        pts -= 0.8; // High changes show guessing/doubt
    }

    // 3. Correctness (Accuracy) plays a stronger positive role
    pts += (accuracyScore - 0.5) * 4;

    // 4. Written reflection length
    const words = reflectionText.trim().split(/\s+/).filter(Boolean).length;
    if (words >= 20) {
        pts += 0.5;
    } else if (words < 5) {
        pts -= 0.5;
    }

    return Math.max(1, Math.min(10, Math.round(pts * 10) / 10));
}

// ─── CLIENT-SIDE COGNITIVE HEURISTICS (Improvement #4 fallback) ───────────────

const CAUSAL_KEYWORDS = ['because', 'due to', 'so that', 'therefore', 'consequently', 'as a result', 'since', 'hence', 'in order to', 'this means'];
const SELF_AWARE_KEYWORDS = ['i should have', 'my mistake', 'i assumed', 'i rushed', 'next time', "i'd change", 'i could have', 'i was wrong', 'i misjudged', 'i overlooked', 'i realise', 'i realize'];
const LEARNING_KEYWORDS = ['learn', 'improve', 'better', 'practice', 'next time', 'grow', 'develop', 'work on'];

function clamp01(n: number): number {
    return Math.max(0, Math.min(1, n));
}

/** Flatten every student answer into a single lowercase text blob. */
function collectAnswerText(answers: Answers, questions: Question[]): { all: string; reflection: string } {
    let all = '';
    let reflection = '';
    questions.forEach(q => {
        const a = answers[q.id];
        let text = '';
        if (Array.isArray(a)) text = a.join(' ');
        else if (typeof a === 'string') text = a.includes('|') ? a.split('|').slice(1).join(' ') : a;
        all += ' ' + text;
        if (q.type === 'reflection') reflection += ' ' + text;
    });
    return { all: all.toLowerCase().trim(), reflection: reflection.toLowerCase().trim() };
}

function keywordHits(text: string, keywords: string[]): number {
    return keywords.reduce((n, k) => (text.includes(k) ? n + 1 : n), 0);
}

/**
 * Reliable, fully offline estimate of cognitive features from the raw answers.
 * Used as a fallback when the LLM evaluation fails or is unavailable.
 */
export function heuristicCognitiveFeatures(
    answers: Answers,
    questions: Question[],
    overallMetrics?: OverallMetrics
): CognitiveFeatures {
    const { reflection } = collectAnswerText(answers, questions);

    // Extract text written in reflection or text input questions
    const textQuestions = questions.filter(q => q.type === 'reflection' || q.type === 'text' || q.type === 'multi-text');
    let writtenText = '';
    textQuestions.forEach(q => {
        const a = answers[q.id];
        if (typeof a === 'string') {
            writtenText += ' ' + (a.includes('|') ? a.split('|').slice(1).join(' ') : a);
        } else if (Array.isArray(a)) {
            writtenText += ' ' + a.join(' ');
        }
    });
    writtenText = writtenText.toLowerCase().trim();

    const words = writtenText.split(/\s+/).filter(Boolean).length;
    const uniqueWords = new Set(writtenText.split(/\s+/).filter(Boolean)).size;
    const lexicalDiversity = words > 0 ? uniqueWords / words : 0;

    // 1. Reflection Depth (Base on reflection length + causal reasoning)
    const lengthScore = clamp01(words / 45); // 45+ words of written text is a solid reflection for a scenario
    const causalScore = clamp01(keywordHits(writtenText, CAUSAL_KEYWORDS) / 2);
    let reflection_depth = lengthScore * 0.6 + causalScore * 0.4;

    // Adjust reflection depth with behavioral indicators if available
    if (overallMetrics) {
        // Average response time: taking time (45s - 90s) increases reflection depth
        const avgTime = overallMetrics.avgResponseTime;
        if (avgTime >= 45 && avgTime <= 90) reflection_depth += 0.15;
        else if (avgTime < 25) reflection_depth -= 0.15; // Rushing shows shallow reflection
        
        // Backtracking shows review and deeper processing
        if (overallMetrics.backtrackCount > 1) reflection_depth += 0.1;
    }
    reflection_depth = clamp01(reflection_depth);

    // 2. Self-Awareness (Base on self-critical keywords in reflection + backtracking)
    const selfAwareHits = keywordHits(reflection, SELF_AWARE_KEYWORDS);
    let self_awareness = clamp01(selfAwareHits / 2);

    if (overallMetrics) {
        // Changing answers indicates self-correction
        const changes = overallMetrics.totalAnswerChanges;
        if (changes >= 2 && changes <= 5) self_awareness += 0.2;
        else if (changes > 6) self_awareness += 0.1; // Too many might be guessing
        
        if (overallMetrics.backtrackCount > 0) self_awareness += 0.1;
        if (overallMetrics.rushedDecisions > 2) self_awareness -= 0.1; // Careless rushing indicates lower self-awareness
    }
    self_awareness = clamp01(self_awareness);

    // 3. Learning Orientation (Base on learning keywords + steady performance)
    const learningHits = keywordHits(writtenText, LEARNING_KEYWORDS);
    let learning_orientation = clamp01(learningHits / 2);

    if (overallMetrics) {
        if (overallMetrics.skippedQuestions === 0) learning_orientation += 0.2; // Completed all questions
        if (overallMetrics.overtimeCount <= 1) learning_orientation += 0.1; // Respects limits
        if (overallMetrics.rushedDecisions === 0) learning_orientation += 0.1; // Didn't rush through
    }
    learning_orientation = clamp01(learning_orientation);

    // 4. Creativity (Base on lexical diversity + original choices)
    let creativity_score = lexicalDiversity * 0.5 + clamp01(words / 60) * 0.3;
    if (overallMetrics) {
        // Moderate revisions (exploring alternatives) is associated with creative problem solving
        const changes = overallMetrics.totalAnswerChanges;
        if (changes >= 1 && changes <= 4) creativity_score += 0.2;
    }
    creativity_score = clamp01(creativity_score);

    // ─── TRI-FACTOR SAFEGUARD (Language + Behavior + Decision Dynamics) ──────────
    // Protects non-native / ESL students: If written text is brief (words < 15) but
    // decision dynamics (accuracy & deliberate pacing) are strong, compensate cognitive
    // scores so language barriers do not unfairly lower their cognitive diagnosis!
    if (words < 15 && overallMetrics) {
        const avgTime = overallMetrics.avgResponseTime;
        const isDeliberate = avgTime >= 30 && avgTime <= 90;
        const isNotImpulsive = overallMetrics.rushedDecisions === 0;

        if (isDeliberate && isNotImpulsive) {
            reflection_depth = Math.max(reflection_depth, 0.45);
            self_awareness = Math.max(self_awareness, overallMetrics.totalAnswerChanges > 0 ? 0.5 : 0.4);
            learning_orientation = Math.max(learning_orientation, overallMetrics.skippedQuestions === 0 ? 0.55 : 0.4);
            creativity_score = Math.max(creativity_score, 0.45);
        }
    }

    const evaluationInsight = words > 0
        ? 'Tri-Factor Cognitive Evaluation (Language + Behavior + Decision Dynamics) applied for fair & inclusive diagnosis.'
        : 'Dual-Factor Cognitive Evaluation (Behavioral Telemetry + Decision Dynamics) applied for MCQ assessment.';

    return {
        reflection_depth: Math.round(reflection_depth * 100) / 100,
        self_awareness: Math.round(self_awareness * 100) / 100,
        learning_orientation: Math.round(learning_orientation * 100) / 100,
        creativity_score: Math.round(creativity_score * 100) / 100,
        insights: [evaluationInsight],
    };
}

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

    // ANTI-CHEAT GATEKEEPER (shared with the dynamic-confidence engine)
    const isSkippingBehavior = detectSkippingBehavior(overall, accuracyScore);
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
            if (isSkippingBehavior) return 0;

            if (avgTime < 25) s += 0.3;
            else if (avgTime < 35) s += 0.2;
            else if (avgTime < 55) s += 0.1; // Widen to < 55s
            
            if (overall.avgTimeToStart < 3) s += 0.15; // Widen to < 3s
            if (overall.decisionStyle === 'impulsive') s += 0.1;

            if (confidence < 7) s += 0.1; // Widen to < 7
            if (accuracyScore < 0.6) s += 0.2; // Widen to < 0.6
            if (answerChanges < 3) s += 0.1;
            if (skipped >= 1) s += 0.15; 
            if (cognitive.reflection_depth < 0.55) s += 0.1;
            if (overall.rushedDecisions > 1) s += 0.1;
            return Math.min(s, 1);
        }

        case 'slow_thorough': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (avgTime > 100) s += 0.3;
            else if (avgTime > 80) s += 0.2;
            else if (avgTime > 55) s += 0.1; // Widen to > 55s
            else if (avgTime > 40) s += 0.05;

            if (overall.avgTimeToStart > 6) s += 0.1; // Widen to > 6s
            if (overall.decisionStyle === 'deliberate') s += 0.1;

            if (confidence >= 5) s += 0.15; // Widen to >= 5
            if (answerChanges >= 3) s += 0.15; // Widen to >= 3
            else if (answerChanges >= 1) s += 0.1;
            if (cognitive.reflection_depth > 0.5) s += 0.15; // Widen to > 0.5
            if (overall.overthinkingCount >= 1) s += 0.1;
            if (overtime >= 1) s += 0.1;
            if (skipped === 0) s += 0.05;
            return Math.min(s, 1);
        }

        case 'concept_struggler': {
            if (isSkippingBehavior) return 0;
            if (accuracyScore <= 0.25 && cognitive.reflection_depth <= 0.25) {
                return 0.1; 
            }
            let s = 0;
            if (avgTime > 90) s += 0.15;
            if (accuracyScore < 0.4) s += 0.35;
            if (confidence < 4) s += 0.25; // Widen to < 4 (only struggling if very low confidence)
            else if (confidence < 5) s += 0.15;
            if (improvementRate < 0.05) s += 0.2;
            if (cognitive.learning_orientation < 0.35) s += 0.15;
            if (skipped >= 2) s += 0.1;
            if (overtime >= 3) s += 0.1;
            if (backtrack > 3 && answerChanges > 3) s += 0.05;
            return Math.min(s, 1);
        }

        case 'fast_learner': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (avgTime < 45) s += 0.2; // Widen to < 45s
            else if (avgTime < 55) s += 0.1;

            if (accuracyScore > 0.7) s += 0.25;
            else if (accuracyScore > 0.5) s += 0.15; // Added gradual band
            if (overall.totalResponseLength > 10) s += 0.1; // Widen from 30 to 10 characters
            
            if (confidence >= 8) s += 0.15; // Widen to >= 8
            else if (confidence >= 5) s += 0.1; // Widen to >= 5

            if (overall.timeTrend === 'speeding_up' || overall.timeTrend === 'stable') s += 0.15; // Widen timeTrend
            if (improvementRate > 0.15) s += 0.2; // Widen from 0.2 to 0.15
            else if (improvementRate > 0.05) s += 0.1;
            if (skipped === 0) s += 0.05;
            if (overtime <= 1) s += 0.05; // Widen to <= 1
            return Math.min(s, 1);
        }

        case 'inconsistent_performer': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (variance > 0.5) s += 0.45; // Widen to > 0.5
            else if (variance > 0.3) s += 0.25;
            if (backtrack > 3) s += 0.2; // Widen to > 3
            else if (backtrack > 1) s += 0.1;
            if (answerChanges > 5) s += 0.2; // Widen to > 5
            else if (answerChanges > 3) s += 0.1;
            if (overall.rushedDecisions >= 2 && overall.overthinkingCount >= 1) s += 0.1;
            if (skipped >= 1 && overtime >= 1) s += 0.1;
            return Math.min(s, 1);
        }

        case 'steady_achiever': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (variance < 0.45) s += 0.35; // Widen to < 0.45
            else if (variance < 0.6) s += 0.2;
            if (confidence >= 4 && confidence <= 8) s += 0.2; // Widen to 4-8
            if (overall.timeTrend === 'stable' || overall.timeTrend === 'speeding_up') s += 0.25; // Widen timeTrend
            if (avgTime >= 25 && avgTime <= 90) s += 0.15; // Widen to 25-90s
            if (skipped === 0) s += 0.05;
            if (overtime <= 3) s += 0.05; // Widen from <=1 to <=3
            return Math.min(s, 1);
        }

        case 'strategic_thinker': {
            if (isSkippingBehavior) return 0;
            let s = 0;
            if (cognitive.creativity_score > 0.6) s += 0.25;
            else if (cognitive.creativity_score > 0.45) s += 0.15; // Widen to > 0.45
            
            if (cognitive.reflection_depth > 0.6) s += 0.25;
            else if (cognitive.reflection_depth > 0.45) s += 0.15; // Widen to > 0.45
            
            if (overall.totalResponseLength > 20) s += 0.1; // Widen to > 20
            if (overall.decisionStyle === 'deliberate' || overall.decisionStyle === 'balanced') s += 0.1; // Widen decisionStyle

            if (avgTime >= 25 && avgTime <= 95) s += 0.15; // Widen to 25-95s
            if (cognitive.self_awareness > 0.6) s += 0.2;
            else if (cognitive.self_awareness > 0.45) s += 0.1; // Widen to > 0.45
            return Math.min(s, 1);
        }

        default:
            return 0;
    }
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Classify a student into one (or a blend) of the 8 learner categories.
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
 *
 * Improvement #7: the score is now difficulty-calibrated — succeeding at a hard
 * round (Level 7-10) is worth more than the same accuracy on an easy round, so
 * the learning curve reflects real cognitive adaptation across rounds.
 */
export function calculatePerformanceScore(
    overall: OverallMetrics,
    confidence: number,
    accuracyScore: number,
    difficultyLevel: number = 5
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

    const base = accScore + confScore + speedScore + consistencyScore + engagementScore;

    // Difficulty calibration: scale by how hard the round was. A perfect run on
    // Level 10 can exceed a perfect run on Level 5; an easy round is slightly
    // discounted. Multiplier ranges ~0.9 (Lvl 1) → ~1.18 (Lvl 10).
    const difficultyMultiplier = 0.88 + (difficultyLevel / 10) * 0.3;

    return Math.min(Math.max(base * difficultyMultiplier, 0), 1);
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
