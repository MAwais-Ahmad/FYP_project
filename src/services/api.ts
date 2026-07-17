/// <reference types="vite/client" />
import { CognitiveFeatures, DifficultySignal, Question, Scenario } from '../types/quiz.types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') || '/api';

// ─── AUTH TOKEN MANAGEMENT ───────────────────────────────────────────────────
function getToken(): string | null {
    return localStorage.getItem('aita_token');
}

export function setToken(token: string) {
    localStorage.setItem('aita_token', token);
}

export function clearToken() {
    localStorage.removeItem('aita_token');
}

function authHeaders(): Record<string, string> {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// ─── AUTH API ────────────────────────────────────────────────────────────────
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthResponse {
    success: boolean;
    token?: string;
    user?: AuthUser;
    error?: string;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
    });
    const data = await response.json();
    if (data.token) setToken(data.token);
    return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.token) setToken(data.token);
    return data;
}

export async function logout(): Promise<void> {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: authHeaders(),
        });
    } catch { /* ignore */ }
    clearToken();
}

export async function getMe(): Promise<AuthResponse> {
    const token = getToken();
    if (!token) return { success: false, error: 'No token' };
    const response = await fetch(`${API_BASE}/auth/me`, {
        headers: authHeaders(),
    });
    if (!response.ok) {
        clearToken();
        return { success: false, error: 'Invalid session' };
    }
    return response.json();
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return response.json();
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
    });
    return response.json();
}

// ─── SESSION API ─────────────────────────────────────────────────────────────
export interface SessionData {
    id: string;
    code: string;
    title: string;
    hostId: string;
    isActive: boolean;
    createdAt: string;
    host?: { id: string; name: string };
    members?: any[];
    myMembership?: { id: string; recordId: string | null; joinedAt: string };
}

export async function createSession(title: string): Promise<{ success: boolean; session?: SessionData; error?: string }> {
    const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title }),
    });
    return response.json();
}

export async function listSessions(): Promise<{ success: boolean; hosted: SessionData[]; joined: SessionData[] }> {
    const response = await fetch(`${API_BASE}/sessions`, {
        headers: authHeaders(),
    });
    return response.json();
}

export async function getSessionByCode(code: string): Promise<{ success: boolean; session?: SessionData; error?: string }> {
    const response = await fetch(`${API_BASE}/sessions/code/${code.toUpperCase()}`, {
        headers: authHeaders(),
    });
    return response.json();
}

export async function joinSession(code: string): Promise<{ success: boolean; membership?: any; message?: string; error?: string }> {
    const response = await fetch(`${API_BASE}/sessions/code/${code.toUpperCase()}/join`, {
        method: 'POST',
        headers: authHeaders(),
    });
    return response.json();
}

export async function getSessionResults(sessionId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/results`, {
        headers: authHeaders(),
    });
    return response.json();
}

export async function toggleSession(sessionId: string, isActive?: boolean): Promise<any> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive }),
    });
    return response.json();
}

// ─── EXISTING API (with auth headers injected) ──────────────────────────────

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
        headers: authHeaders(),
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
        vark?: {
            visual: number;
            auditory: number;
            readWrite: number;
            kinesthetic: number;
        };
    };
    usage: {
        tokens: number;
        estimatedCost: number;
    };
}

export async function evaluateScenario(
    scenario: any,
    questions: any[],
    answers: any,
    studentName?: string
): Promise<EvaluateScenarioResponse> {
    const response = await fetch(`${API_BASE}/evaluate-scenario`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ scenario, questions, answers, studentName }),
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

export async function saveRecord(record: any): Promise<{ success: boolean; id?: string }> {
    const response = await fetch(`${API_BASE}/records`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(record),
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

export async function fetchRecords(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/records`, {
        headers: authHeaders(),
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

export async function fetchRecordsByName(name: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/records/student/${encodeURIComponent(name)}`, {
        headers: authHeaders(),
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}
