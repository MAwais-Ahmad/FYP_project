/// <reference types="vite/client" />
import { CognitiveFeatures, DifficultySignal, Question, Scenario } from '../types/quiz.types';

let rawBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
if (rawBase && !rawBase.startsWith('http://') && !rawBase.startsWith('https://')) {
    rawBase = 'https://' + rawBase;
}
if (rawBase && !rawBase.endsWith('/api')) {
    rawBase += '/api';
}
const API_BASE = rawBase || '/api';

// ─── SAFE API FETCH HELPER (Traps Network & DNS Errors) ──────────────────────
async function safeApiJson(url: string, init?: RequestInit): Promise<any> {
    try {
        const response = await fetch(url, init);
        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errJson.error || errJson.message || `Server error (${response.status})`,
            };
        }
        return await response.json();
    } catch (err: any) {
        console.warn(`⚠️ Network request failed [${url}]:`, err.message || err);
        return {
            success: false,
            error: 'Network connection failed. Please check your connection or backend server URL.',
        };
    }
}

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
    const data = await safeApiJson(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
    });
    if (data.token) setToken(data.token);
    // Offline local fallback if API server URL is unreachable or offline
    if (!data.success && data.error?.includes('Network connection failed')) {
        const fallbackUser: AuthUser = {
            id: `local-${Date.now()}`,
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            role: 'student',
        };
        const token = `offline-token-${Date.now()}`;
        setToken(token);
        return { success: true, token, user: fallbackUser };
    }
    return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const data = await safeApiJson(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (data.token) setToken(data.token);
    // Offline local fallback if API server URL is unreachable or offline
    if (!data.success && data.error?.includes('Network connection failed')) {
        const fallbackUser: AuthUser = {
            id: `local-${Date.now()}`,
            email: email.toLowerCase(),
            name: email.split('@')[0],
            role: 'student',
        };
        const token = `offline-token-${Date.now()}`;
        setToken(token);
        return { success: true, token, user: fallbackUser };
    }
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
    const data = await safeApiJson(`${API_BASE}/auth/me`, {
        headers: authHeaders(),
    });
    if (!data.success) {
        if (token.startsWith('offline-token-')) {
            return {
                success: true,
                user: { id: 'local-user', email: 'offline@aita.local', name: 'Offline Student', role: 'student' }
            };
        }
        clearToken();
        return { success: false, error: 'Invalid session' };
    }
    return data;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return safeApiJson(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return safeApiJson(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
    });
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
    return safeApiJson(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title }),
    });
}

export async function listSessions(): Promise<{ success: boolean; hosted: SessionData[]; joined: SessionData[] }> {
    const data = await safeApiJson(`${API_BASE}/sessions`, {
        headers: authHeaders(),
    });
    return data.success ? data : { success: false, hosted: [], joined: [] };
}

export async function getSessionByCode(code: string): Promise<{ success: boolean; session?: SessionData; error?: string }> {
    return safeApiJson(`${API_BASE}/sessions/code/${code.toUpperCase()}`, {
        headers: authHeaders(),
    });
}

export async function joinSession(code: string): Promise<{ success: boolean; membership?: any; message?: string; error?: string }> {
    return safeApiJson(`${API_BASE}/sessions/code/${code.toUpperCase()}/join`, {
        method: 'POST',
        headers: authHeaders(),
    });
}

export async function getSessionResults(sessionId: string): Promise<any> {
    return safeApiJson(`${API_BASE}/sessions/${sessionId}/results`, {
        headers: authHeaders(),
    });
}

export async function toggleSession(sessionId: string, isActive?: boolean): Promise<any> {
    return safeApiJson(`${API_BASE}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive }),
    });
}

export async function deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return safeApiJson(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
}

// Role-aware session view (host or member): status, whether the host has created
// the assessment yet, the caller's own progress, and (host only) all participants.
export async function getSessionView(sessionId: string): Promise<any> {
    return safeApiJson(`${API_BASE}/sessions/${sessionId}/view`, {
        headers: authHeaders(),
    });
}

// Host attaches the single assessment everyone will take.
// payload: { kind: 'custom-exam', examId } | { kind:'custom-exam', exam } | { kind:'ai-scenario', scenario, questions, difficultyLevel }
export async function setSessionAssessment(sessionId: string, payload: any): Promise<{ success: boolean; kind?: string; assessment?: any; error?: string }> {
    return safeApiJson(`${API_BASE}/sessions/${sessionId}/assessment`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });
}

// Fetch the (answer-key-stripped) assessment to take or preview. 404 while none.
export async function getSessionAssessment(sessionId: string): Promise<{ success: boolean; assessment?: any; error?: string }> {
    return safeApiJson(`${API_BASE}/sessions/${sessionId}/assessment`, {
        headers: authHeaders(),
    });
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
    return safeApiJson(`${API_BASE}/generate-scenario`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ difficultySignal, scenarioNumber, difficultyLevel, previousThemes }),
    });
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
    answers: any,
    studentName?: string
): Promise<EvaluateScenarioResponse> {
    return safeApiJson(`${API_BASE}/evaluate-scenario`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ scenario, questions, answers, studentName }),
    });
}

export async function healthCheck(): Promise<{ status: string; model: string }> {
    return safeApiJson(`${API_BASE}/health`);
}

export async function saveRecord(record: any): Promise<{ success: boolean; id?: string }> {
    return safeApiJson(`${API_BASE}/records`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(record),
    });
}

export async function fetchRecords(): Promise<any[]> {
    const data = await safeApiJson(`${API_BASE}/records`, {
        headers: authHeaders(),
    });
    return Array.isArray(data) ? data : [];
}

export async function fetchRecordsByName(name: string): Promise<any[]> {
    const data = await safeApiJson(`${API_BASE}/records/student/${encodeURIComponent(name)}`, {
        headers: authHeaders(),
    });
    return Array.isArray(data) ? data : [];
}

// ─── DYNAMIC ASSESSMENT API ──────────────────────────────────────────────────

export async function uploadPdf(
    files: File | File[]
): Promise<{ success: boolean; text?: string; pageCount?: number; fileCount?: number; failedFiles?: string[]; error?: string }> {
    const formData = new FormData();
    const list = Array.isArray(files) ? files : [files];
    list.forEach(f => formData.append('pdf', f));
    try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${API_BASE}/upload-pdf`, {
            method: 'POST',
            headers,
            body: formData,
        });
        return await response.json();
    } catch {
        return { success: false, error: 'Network error uploading document(s)' };
    }
}

export async function generateExam(config: {
    materialText: string;
    mcqCount: number;
    shortCount: number;
    longCount: number;
    mcqMarks?: number;
    shortMarks?: number;
    longMarks?: number;
    manualQuestions?: any[];
    difficulty: string;
}): Promise<{ success: boolean; exam?: any; error?: string }> {
    return safeApiJson(`${API_BASE}/generate-exam`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(config),
    });
}

export async function gradeExam(payload: {
    examId?: string;
    exam?: any;
    answers: Record<number, string | string[]>;
    sessionId?: string | null;
}): Promise<{ success: boolean; result?: any; error?: string }> {
    return safeApiJson(`${API_BASE}/grade-exam`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });
}

export async function parsePaper(text: string): Promise<{ success: boolean; exam?: any; error?: string }> {
    return safeApiJson(`${API_BASE}/parse-paper`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
    });
}

export async function sendChatMessage(
    messages: { role: string; content: string }[],
    recordContext?: any
): Promise<{ success: boolean; message?: string; error?: string }> {
    return safeApiJson(`${API_BASE}/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messages, recordContext }),
    });
}
