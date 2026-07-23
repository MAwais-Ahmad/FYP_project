// User-Specific Soft Delete (Frontend Hide List)
// Allows a user to delete/hide records, hosted sessions, or joined sessions from their view
// WITHOUT deleting any data from the PostgreSQL database.

const HIDDEN_ITEMS_KEY_PREFIX = 'aita_hidden_items_v1_';

function getKey(userIdOrName: string): string {
    const safeId = (userIdOrName || 'guest').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `${HIDDEN_ITEMS_KEY_PREFIX}${safeId}`;
}

export interface HiddenItems {
    records: string[];  // Array of record IDs hidden by this user
    sessions: string[]; // Array of session IDs hidden by this user
}

export function getHiddenItems(userIdOrName: string): HiddenItems {
    if (typeof localStorage === 'undefined') return { records: [], sessions: [] };
    try {
        const raw = localStorage.getItem(getKey(userIdOrName));
        if (!raw) return { records: [], sessions: [] };
        const parsed = JSON.parse(raw);
        return {
            records: Array.isArray(parsed?.records) ? parsed.records : [],
            sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
        };
    } catch {
        return { records: [], sessions: [] };
    }
}

export function hideRecordForUser(userIdOrName: string, recordId: string): void {
    if (typeof localStorage === 'undefined') return;
    const current = getHiddenItems(userIdOrName);
    if (!current.records.includes(recordId)) {
        current.records.push(recordId);
        localStorage.setItem(getKey(userIdOrName), JSON.stringify(current));
    }
}

export function hideSessionForUser(userIdOrName: string, sessionId: string): void {
    if (typeof localStorage === 'undefined') return;
    const current = getHiddenItems(userIdOrName);
    if (!current.sessions.includes(sessionId)) {
        current.sessions.push(sessionId);
        localStorage.setItem(getKey(userIdOrName), JSON.stringify(current));
    }
}

export function isRecordHiddenForUser(userIdOrName: string, recordId: string): boolean {
    const current = getHiddenItems(userIdOrName);
    return current.records.includes(recordId);
}

export function isSessionHiddenForUser(userIdOrName: string, sessionId: string): boolean {
    const current = getHiddenItems(userIdOrName);
    return current.sessions.includes(sessionId);
}
