import { useState, useEffect } from 'react';
import { getSessionResults, toggleSession, deleteSession, AuthUser } from '../../services/api';
import { StudentRecord } from '../../utils/storage';
import { RecordBlock } from '../ui/RecordBlock';

interface SessionDashboardProps {
    sessionId: string;
    user: AuthUser;
    onBack: () => void;
    onViewRecord: (record: StudentRecord) => void;
    onStartSessionTest: (sessionId: string) => void;
}

interface SessionMember {
    id: string;
    user: { id: string; name: string; email?: string };
    joinedAt: string;
    recordId: string | null;
    record: any | null;
    status: 'completed' | 'in-progress';
}

interface SessionInfo {
    id: string;
    code: string;
    title: string;
    isActive: boolean;
    createdAt: string;
    host: { id: string; name: string };
}

export function SessionDashboard({
    sessionId,
    user,
    onBack,
    onViewRecord,
    onStartSessionTest,
}: SessionDashboardProps) {
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [members, setMembers] = useState<SessionMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getSessionResults(sessionId);
            if (data.success) {
                setSession(data.session);
                setMembers(data.members || []);
                setIsHost(data.session.host.id === user.id);
            } else {
                setError(data.error || 'Could not load session');
            }
        } catch {
            setError('Failed to load session data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [sessionId]);

    const handleCopyCode = () => {
        if (session?.code) {
            navigator.clipboard.writeText(session.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleToggleSession = async () => {
        if (!session) return;
        const result = await toggleSession(session.id, !session.isActive);
        if (result.success) {
            setSession({ ...session, isActive: !session.isActive });
        }
    };

    const handleDeleteSession = async () => {
        if (!session) return;
        setIsDeleting(true);
        setDeleteError('');
        const result = await deleteSession(session.id);
        if (result.success) {
            onBack();
        } else {
            setDeleteError(result.error || 'Failed to delete session');
            setIsDeleting(false);
        }
    };

    // Build StudentRecord from session member's record data
    const memberToRecord = (member: SessionMember): StudentRecord | null => {
        if (!member.record) return null;
        const r = member.record;
        return {
            id: r.id,
            name: member.user.name,
            date: r.date || r.createdAt,
            scenariosCompleted: r.scenariosCompleted,
            primaryCategory: r.primaryCategory,
            primaryName: r.primaryName,
            primaryEmoji: r.primaryEmoji,
            primaryConfidence: r.primaryConfidence,
            secondaryCategory: r.secondaryCategory,
            secondaryName: r.secondaryName,
            confidence: r.confidence,
            performanceScore: r.performanceScore,
            avgPerformanceScore: r.avgPerformanceScore,
            accuracyScore: r.accuracyScore,
            avgResponseTime: r.avgResponseTime,
            decisionStyle: r.decisionStyle,
            cognitive: r.cognitive,
            overall: r.overall,
            scenarioResults: r.scenarioResults,
        };
    };

    // Summary stats
    const completedMembers = members.filter((m) => m.status === 'completed');
    const avgPerformance =
        completedMembers.length > 0
            ? completedMembers.reduce(
                  (sum, m) => sum + (m.record?.performanceScore || 0),
                  0
              ) / completedMembers.length
            : 0;
    const avgAccuracy =
        completedMembers.length > 0
            ? completedMembers.reduce(
                  (sum, m) => sum + (m.record?.accuracyScore || 0),
                  0
              ) / completedMembers.length
            : 0;

    if (isLoading) {
        return (
            <section className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="text-4xl animate-spin">⏳</div>
                    <p className="text-white/50">Loading session...</p>
                </div>
            </section>
        );
    }

    if (error || !session) {
        return (
            <section className="min-h-screen flex items-center justify-center p-6">
                <div className="glass-card p-8 text-center space-y-4 max-w-md">
                    <div className="text-4xl">⚠️</div>
                    <h2 className="text-xl font-bold">Session Error</h2>
                    <p className="text-white/50">{error || 'Session not found'}</p>
                    <button onClick={onBack} className="btn-primary">
                        ← Go Back
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="btn-secondary !py-2 !px-3 text-sm">
                    ← Back
                </button>
            </div>

            {/* Session Info Card */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{session.title}</h1>
                        <p className="text-white/40 text-sm">
                            Hosted by {session.host.name} •{' '}
                            {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span
                            className={`text-xs px-2 py-1 rounded-full ${
                                session.isActive
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                            }`}
                        >
                            {session.isActive ? '🟢 Active' : '🔴 Closed'}
                        </span>
                        {isHost && (
                            <>
                                <button
                                    onClick={handleToggleSession}
                                    className="btn-secondary !py-1.5 !px-3 text-xs"
                                >
                                    {session.isActive ? 'Close Session' : 'Reopen Session'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="btn-secondary !py-1.5 !px-3 text-xs !text-red-400 hover:!bg-red-500/10"
                                >
                                    🗑️ Delete Session
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Join Code */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                    <div className="flex-1">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                            Join Code
                        </p>
                        <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary-400">
                            {session.code}
                        </p>
                    </div>
                    <button
                        onClick={handleCopyCode}
                        className="btn-secondary !py-2 !px-4 text-sm"
                    >
                        {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                </div>

                {/* Summary Stats */}
                {completedMembers.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-xl bg-white/5">
                            <div className="text-2xl font-bold">{members.length}</div>
                            <div className="text-xs text-white/40">Participants</div>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-white/5">
                            <div className="text-2xl font-bold">
                                {Math.round(avgPerformance * 100)}%
                            </div>
                            <div className="text-xs text-white/40">Avg Performance</div>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-white/5">
                            <div className="text-2xl font-bold">
                                {Math.round(avgAccuracy * 100)}%
                            </div>
                            <div className="text-xs text-white/40">Avg Accuracy</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Start assessment — available to the host too, same options as solo assessment */}
            <div className="glass-card p-6 text-center space-y-3">
                <div className="text-3xl">🧠</div>
                <h2 className="text-lg font-semibold">
                    {isHost ? 'Want to try the assessment yourself?' : 'Ready to take the assessment?'}
                </h2>
                <p className="text-white/50 text-sm">
                    {isHost
                        ? "Take the same assessment you're hosting — AI Scenario, Custom Paper, or AI Material — just like a solo assessment."
                        : 'Complete the AITA assessment for this session. Your results will be visible to the host.'}
                </p>
                <button
                    onClick={() => onStartSessionTest(sessionId)}
                    className="btn-primary !py-3 !px-8"
                >
                    Start Assessment
                </button>
            </div>

            {/* Participants */}
            {isHost && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            👥 Participants
                            <span className="text-white/40 text-sm font-normal ml-2">
                                ({completedMembers.length}/{members.length} completed)
                            </span>
                        </h2>
                        <button
                            onClick={loadData}
                            className="btn-secondary !py-1.5 !px-3 text-xs"
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {members.length === 0 ? (
                        <div className="glass-card p-8 text-center space-y-3">
                            <div className="text-4xl">⏳</div>
                            <p className="text-white/50">
                                No participants yet. Share the join code{' '}
                                <span className="font-mono font-bold text-primary-400">
                                    {session.code}
                                </span>{' '}
                                with your students.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map((member) => {
                                const record = memberToRecord(member);
                                if (record) {
                                    return (
                                        <RecordBlock
                                            key={member.id}
                                            record={record}
                                            onClick={() => onViewRecord(record)}
                                            showName
                                        />
                                    );
                                }
                                // In-progress member
                                return (
                                    <div
                                        key={member.id}
                                        className="w-full glass-card p-4 flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                                            ⏳
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold">
                                                {member.user.name}
                                            </div>
                                            <div className="text-xs text-white/40">
                                                Joined{' '}
                                                {new Date(
                                                    member.joinedAt
                                                ).toLocaleDateString()}{' '}
                                                • Assessment in progress...
                                            </div>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 animate-pulse">
                                            In Progress
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Session Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-5 border border-red-500/20 shadow-2xl">
                        <div className="text-5xl">🗑️</div>
                        <h2 className="text-xl font-bold">Delete "{session.title}"?</h2>
                        <p className="text-sm text-white/60">
                            This permanently deletes the session and its join code ({session.code}).
                            {members.length > 0 && (
                                <> {members.length} participant{members.length > 1 ? 's' : ''} will lose access, though their own completed results stay on their personal dashboards.</>
                            )}
                            {' '}This can't be undone.
                        </p>
                        {deleteError && (
                            <p className="text-red-400 text-sm">⚠️ {deleteError}</p>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="btn-secondary !py-2.5 !px-5 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSession}
                                disabled={isDeleting}
                                className="btn-primary !py-2.5 !px-6 !bg-red-500 hover:!bg-red-600 disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : '🗑️ Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
