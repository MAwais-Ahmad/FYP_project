import { Scenario, Question, CognitiveFeatures } from '../types/quiz.types';

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

interface AnalyzeReflectionResponse {
    success: boolean;
    analysis: CognitiveFeatures;
    usage: {
        tokens: number;
        estimatedCost: number;
    };
}

export async function generateScenario(): Promise<GenerateScenarioResponse> {
    const response = await fetch(`${API_BASE}/generate-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

export async function analyzeReflection(
    reflectionText: string,
    confidenceRating: number,
    scenario: string
): Promise<AnalyzeReflectionResponse> {
    const response = await fetch(`${API_BASE}/analyze-reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            reflectionText,
            confidenceRating,
            scenario
        })
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
