import { CognitiveFeatures, DifficultySignal, Question, Scenario } from '../types/quiz.types';

const API_BASE = '/api';

interface GenerateScenarioResponse {
    success: boolean;
    scenario: Scenario;
    questions: Question[];
    usage: {
        tokens: number;
        estimatedCost: number;
    };
    message?: string;
}

export async function generateScenario(
    difficultySignal?: DifficultySignal,
    scenarioNumber: number = 1,
    difficultyLevel: number = 5,
    previousThemes: string[] = []
): Promise<GenerateScenarioResponse> {
    const response = await fetch(`${API_BASE}/generate-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficultySignal, scenarioNumber, difficultyLevel, previousThemes }),
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

interface EvaluateScenarioResponse {
    success: boolean;
    evaluation: {
        accuracy_score: number;
        cognitive_features: CognitiveFeatures;
    };
    usage: {
        tokens: number;
        estimatedCost: number;
    };
}

export async function evaluateScenario(
    scenario: any,
    questions: any[],
    answers: any
): Promise<EvaluateScenarioResponse> {
    const response = await fetch(`${API_BASE}/evaluate-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, questions, answers }),
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

export async function healthCheck(): Promise<{ status: string; model: string }> {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
}
