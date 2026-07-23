import { useState, useEffect } from 'react';
import { AuthUser, listSessions, joinSession, createSession, fetchRecordsByName, SessionData } from '../../services/api';
import { StudentRecord } from '../../utils/storage';
import { RecordBlock } from '../ui/RecordBlock';
import { hideRecordForUser, hideSessionForUser, isRecordHiddenForUser, isSessionHiddenForUser } from '../../utils/userHiddenItems';

interface UserDashboardProps {
    user: AuthUser;
    onStartSoloTest: () => void;
    onViewRecord: (record: StudentRecord) => void;
    onViewSession: (sessionId: string) => void;
    onLogout: () => void;
}

export function UserDashboard({
    user,
    onStartSoloTest,
    onViewRecord,
    onViewSession,
    onLogout,
}: UserDashboardProps) {
    const [records, setRecords] = useState<StudentRecord[]>([]);
    const [hostedSessions, setHostedSessions] = useState<SessionData[]>([]);
    const [joinedSessions, setJoinedSessions] = useState<SessionData[]>([]);
    const [joinCode, setJoinCode] = useState('');
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [createError, setCreateError] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const userKey = user.id || user.name;

    useEffect(() => {
        // Fetch user's solo records
        fetchRecordsByName(user.name)
            .then((data) => {
                if (data && Array.isArray(data)) {
                    const mapped: StudentRecord[] = data.map((dbRec: any) => ({
                        id: dbRec.id,
                        name: dbRec.user?.name || user.name,
                        date: dbRec.date,
                        scenariosCompleted: dbRec.scenariosCompleted,
                        primaryCategory: dbRec.primaryCategory,
                        primaryName: dbRec.primaryName,
                        primaryEmoji: dbRec.primaryEmoji,
                        primaryConfidence: dbRec.primaryConfidence,
                        secondaryCategory: dbRec.secondaryCategory,
                        secondaryName: dbRec.secondaryName,
                        confidence: dbRec.confidence,
                        performanceScore: dbRec.performanceScore,
                        avgPerformanceScore: dbRec.avgPerformanceScore,
                        accuracyScore: dbRec.accuracyScore,
                        avgResponseTime: dbRec.avgResponseTime,
                        decisionStyle: dbRec.decisionStyle,
                        cognitive: dbRec.cognitive,
                        overall: dbRec.overall,
                        scenarioResults: dbRec.scenarioResults,
                    }));
                    const visible = mapped.filter(r => !isRecordHiddenForUser(userKey, r.id));
                    setRecords(visible.sort((a, b) => b.date.localeCompare(a.date)));
                }
            })
            .catch(() => {});

        // Fetch sessions
        listSessions()
            .then((data) => {
                if (data.success) {
                    const visibleHosted = (data.hosted || []).filter((s: SessionData) => !isSessionHiddenForUser(userKey, s.id));
                    const visibleJoined = (data.joined || []).filter((s: SessionData) => !isSessionHiddenForUser(userKey, s.id));
                    setHostedSessions(visibleHosted);
                    setJoinedSessions(visibleJoined);
                }
            })
            .catch(() => {});
    }, [user.name, userKey]);

    const handleJoinSession = async () => {
        if (!joinCode.trim()) return;
        setJoinError('');
        setIsJoining(true);
        try {
            const result = await joinSession(joinCode.trim());
            if (result.success) {
                setJoinCode('');
                setShowJoinModal(false);
                // Refresh sessions
                const data = await listSessions();
                if (data.success) {
                    const visibleHosted = (data.hosted || []).filter((s: SessionData) => !isSessionHiddenForUser(userKey, s.id));
                    const visibleJoined = (data.joined || []).filter((s: SessionData) => !isSessionHiddenForUser(userKey, s.id));
                    setHostedSessions(visibleHosted);
                    setJoinedSessions(visibleJoined);
                }
            } else {
                setJoinError(result.error || 'Could not join session');
            }
        } catch {
            setJoinError('Network error');
        } finally {
            setIsJoining(false);
        }
    };

    const handleCreateSession = async () => {
        if (!newSessionTitle.trim()) return;
        setCreateError('');
        setIsCreating(true);
        try {
            const result = await createSession(newSessionTitle.trim());
            if (result.success && result.session) {
                setNewSessionTitle('');
                setShowCreateModal(false);
                // Navigate to the new session
                onViewSession(result.session.id);
            } else {
                setCreateError(result.error || 'Could not create session');
            }
        } catch {
            setCreateError('Network error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteRecord = (recordId: string) => {
        hideRecordForUser(userKey, recordId);
        setRecords(prev => prev.filter(r => r.id !== recordId));
    };

    const handleDeleteSession = (sessionId: string) => {
        hideSessionForUser(userKey, sessionId);
        setHostedSessions(prev => prev.filter(s => s.id !== sessionId));
        setJoinedSessions(prev => prev.filter(s => s.id !== sessionId));
    };

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                        Welcome, {user.name} 👋
                    </h1>
                    <p className="text-white/40 text-sm">{user.email}</p>
                </div>
                <button
                    onClick={onLogout}
                    className="btn-secondary !py-2 !px-4 text-sm"
                >
                    Logout
                </button>
            </div>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-3 gap-4">
                <button
                    onClick={onStartSoloTest}
                    className="glass-card p-5 text-left hover:bg-white/10 transition-all group cursor-pointer"
                >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                        🧠
                    </div>
                    <h3 className="font-semibold text-lg">Solo Assessment</h3>
                    <p className="text-white/50 text-sm mt-1">
                        Take a test on your own
                    </p>
                </button>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="glass-card p-5 text-left hover:bg-white/10 transition-all group cursor-pointer"
                >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                        📋
                    </div>
                    <h3 className="font-semibold text-lg">Create Session</h3>
                    <p className="text-white/50 text-sm mt-1">
                        Host a test for others
                    </p>
                </button>

                <button
                    onClick={() => setShowJoinModal(true)}
                    className="glass-card p-5 text-left hover:bg-white/10 transition-all group cursor-pointer"
                >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                        🔗
                    </div>
                    <h3 className="font-semibold text-lg">Join Session</h3>
                    <p className="text-white/50 text-sm mt-1">
                        Enter a session code
                    </p>
                </button>
            </div>

            {/* Sessions */}
            {(hostedSessions.length > 0 || joinedSessions.length > 0) && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">📋 My Sessions</h2>

                    {hostedSessions.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm text-white/40 uppercase tracking-wider">
                                Hosted by me
                            </h3>
                            {hostedSessions.map((s) => (
                                <div key={s.id} className="relative group">
                                    <button
                                        onClick={() => onViewSession(s.id)}
                                        className="w-full glass-card p-4 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer text-left pr-12"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold shrink-0">
                                            {s.code?.slice(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold truncate">{s.title}</div>
                                            <div className="text-xs text-white/40 flex items-center gap-2">
                                                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">
                                                    {s.code}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    {s.members?.length || 0} participant
                                                    {(s.members?.length || 0) !== 1 ? 's' : ''}
                                                </span>
                                                <span>•</span>
                                                <span
                                                    className={
                                                        s.isActive
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                    }
                                                >
                                                    {s.isActive ? '🟢 Active' : '🔴 Closed'}
                                                </span>
                                            </div>
                                        </div>
                                        <svg
                                            className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                        >
                                            <path d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        title="Remove session from my dashboard view"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(s.id);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all z-10"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {joinedSessions.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm text-white/40 uppercase tracking-wider">
                                Joined
                            </h3>
                            {joinedSessions.map((s) => (
                                <div key={s.id} className="relative group">
                                    <button
                                        onClick={() => onViewSession(s.id)}
                                        className="w-full glass-card p-4 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer text-left pr-12"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-lg font-bold shrink-0">
                                            {s.code?.slice(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold truncate">{s.title}</div>
                                            <div className="text-xs text-white/40 flex items-center gap-2">
                                                <span>Hosted by {s.host?.name || 'Unknown'}</span>
                                                <span>•</span>
                                                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">
                                                    {s.code}
                                                </span>
                                            </div>
                                        </div>
                                        <svg
                                            className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                        >
                                            <path d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        title="Remove session from my dashboard view"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(s.id);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all z-10"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Solo Results */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        🧠 My Assessments
                        {records.length > 0 && (
                            <span className="text-white/40 text-sm font-normal ml-2">
                                ({records.length})
                            </span>
                        )}
                    </h2>
                </div>

                {records.length === 0 ? (
                    <div className="glass-card p-8 text-center space-y-3">
                        <div className="text-4xl">📭</div>
                        <p className="text-white/50">
                            No assessments yet. Take your first solo test!
                        </p>
                        <button onClick={onStartSoloTest} className="btn-primary !py-2 !px-5 text-sm">
                            Start Assessment
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {records.map((record) => (
                            <RecordBlock
                                key={record.id}
                                record={record}
                                onClick={() => onViewRecord(record)}
                                onDelete={() => handleDeleteRecord(record.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Session Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass-card p-6 max-w-md w-full space-y-4">
                        <h2 className="text-xl font-bold">📋 Create a Session</h2>
                        <p className="text-white/50 text-sm">
                            Give your session a title. You'll get a 6-digit code to share.
                        </p>
                        <input
                            type="text"
                            value={newSessionTitle}
                            onChange={(e) => setNewSessionTitle(e.target.value)}
                            placeholder="e.g. CS301 Midterm Assessment"
                            className="text-input"
                            autoFocus
                        />
                        {createError && (
                            <p className="text-red-400 text-sm">⚠️ {createError}</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreateError('');
                                }}
                                className="btn-secondary !py-2 !px-4 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSession}
                                disabled={isCreating || !newSessionTitle.trim()}
                                className="btn-primary !py-2 !px-5 text-sm disabled:opacity-50"
                            >
                                {isCreating ? 'Creating...' : 'Create Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Session Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass-card p-6 max-w-md w-full space-y-4">
                        <h2 className="text-xl font-bold">🔗 Join a Session</h2>
                        <p className="text-white/50 text-sm">
                            Enter the 6-digit code shared by your teacher.
                        </p>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) =>
                                setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                            }
                            placeholder="e.g. A3X7K2"
                            className="text-input text-center text-2xl font-mono tracking-[0.3em]"
                            maxLength={6}
                            autoFocus
                        />
                        {joinError && (
                            <p className="text-red-400 text-sm">⚠️ {joinError}</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowJoinModal(false);
                                    setJoinError('');
                                }}
                                className="btn-secondary !py-2 !px-4 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinSession}
                                disabled={isJoining || joinCode.length < 6}
                                className="btn-primary !py-2 !px-5 text-sm disabled:opacity-50"
                            >
                                {isJoining ? 'Joining...' : 'Join Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
