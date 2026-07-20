import {
    CategoryResult,
    CognitiveFeatures,
    LearnerCategoryId,
    OverallMetrics,
    ScenarioResult,
} from '../types/quiz.types';

// ─── PERSISTED ASSESSMENT RECORD (Improvement #6) ─────────────────────────────
// AITA has no backend database, so completed assessments are persisted to the
// browser's localStorage. Each record powers both the Student dashboard (one
// learner's history) and the Teacher dashboard (class-wide analytics).

export interface StudentRecord {
    id: string;
    name: string;
    date: string; // ISO timestamp
    scenariosCompleted: number;

    // Classification
    primaryCategory: LearnerCategoryId;
    primaryName: string;
    primaryEmoji: string;
    primaryConfidence: number; // 0–1
    secondaryCategory?: LearnerCategoryId;
    secondaryName?: string;

    // Headline metrics
    confidence: number; // behavioural confidence 0–10 (latest round)
    performanceScore: number; // latest round 0–1
    avgPerformanceScore: number; // averaged across rounds 0–1
    accuracyScore: number; // latest round 0–1
    avgResponseTime: number;
    decisionStyle: string;
    cognitive: CognitiveFeatures;

    // Full detail for drill-down
    overall: OverallMetrics;
    scenarioResults: ScenarioResult[];
}

const STORAGE_KEY = 'aita_student_records_v1';

function safeParse(raw: string | null): StudentRecord[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function getRecords(): StudentRecord[] {
    if (typeof localStorage === 'undefined') return [];
    return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function addRecord(record: StudentRecord): void {
    if (typeof localStorage === 'undefined') return;
    const records = getRecords();
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getRecordsByName(name: string): StudentRecord[] {
    const target = name.trim().toLowerCase();
    return getRecords().filter(r => r.name.trim().toLowerCase() === target);
}

export function clearRecords(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

// Build a StudentRecord from the data available on the results screen.
export function buildRecord(
    name: string,
    category: CategoryResult,
    scenarioResults: ScenarioResult[],
    overall: OverallMetrics
): StudentRecord {
    const latest = scenarioResults[scenarioResults.length - 1];
    const avgPerformanceScore =
        scenarioResults.length > 0
            ? scenarioResults.reduce((s, r) => s + r.performanceScore, 0) / scenarioResults.length
            : 0;

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || 'Anonymous',
        date: new Date().toISOString(),
        scenariosCompleted: scenarioResults.length,
        primaryCategory: category.primary_category,
        primaryName: category.primary_name,
        primaryEmoji: category.primary_emoji,
        primaryConfidence: category.primary_confidence,
        secondaryCategory: category.secondary_category,
        secondaryName: category.secondary_name,
        confidence: latest?.confidence ?? 0,
        performanceScore: latest?.performanceScore ?? 0,
        avgPerformanceScore,
        accuracyScore: latest?.accuracyScore ?? 0,
        avgResponseTime: overall.avgResponseTime,
        decisionStyle: overall.decisionStyle,
        cognitive: latest?.cognitive ?? {
            reflection_depth: 0,
            self_awareness: 0,
            learning_orientation: 0,
            creativity_score: 0,
            insights: [],
        },
        overall,
        scenarioResults,
    };
}
