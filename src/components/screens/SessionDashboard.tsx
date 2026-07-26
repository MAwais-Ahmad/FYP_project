import { useState, useEffect } from 'react';
import { getSessionView, getSessionAssessment, toggleSession, AuthUser } from '../../services/api';
import { StudentRecord } from '../../utils/storage';
import { RecordBlock } from '../ui/RecordBlock';
import { hideSessionForUser } from '../../utils/userHiddenItems';

interface SessionDashboardProps {
    sessionId: string;
    user: AuthUser;
    onBack: () => void;
    onViewRecord: (record: StudentRecord) => void;
    onCreateAssessment: (sessionId: string) => void;
    onTakeAssessment: (sessionId: string) => void;
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

const KIND_LABEL: Record<string, string> = {
    'custom-exam': '📝 Custom Exam (MCQ / Short / Long)',
    'ai-scenario': '🧠 AI Decision Scenario',
    'general-aptitude': '🧩 General Aptitude Test',
};

// Map a raw DB record (+ owner name) into the StudentRecord shape RecordDetail uses.
function toStudentRecord(r: any, name: string): StudentRecord | null {
    if (!r) return null;
    return {
        id: r.id,
        name,
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
}

export function SessionDashboard({
    sessionId,
    user,
    onBack,
    onViewRecord,
    onCreateAssessment,
    onTakeAssessment,
}: SessionDashboardProps) {
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [hasAssessment, setHasAssessment] = useState(false);
    const [assessmentKind, setAssessmentKind] = useState<string | null>(null);
    const [me, setMe] = useState<{ joined: boolean; completed: boolean; recordId: string | null; record: any | null }>({ joined: false, completed: false, recordId: null, record: null });
    const [members, setMembers] = useState<SessionMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Preview modal (host)
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewError, setPreviewError] = useState('');

    // `silent` background refreshes (used by auto-polling) don't toggle the
    // full-screen loader or clobber the view with a transient network error.
    const loadData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await getSessionView(sessionId);
            if (data.success) {
                setSession(data.session);
                setIsHost(data.isHost);
                setHasAssessment(data.hasAssessment);
                setAssessmentKind(data.assessmentKind);
                setMe(data.me || { joined: false, completed: false, recordId: null, record: null });
                setMembers(data.members || []);
                setError('');
            } else if (!silent) {
                setError(data.error || 'Could not load session');
            }
        } catch {
            if (!silent) setError('Failed to load session data');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [sessionId]);

    // Participant auto-wait: while a joiner is waiting for the host to publish
    // the assessment, silently poll so it appears automatically (no manual
    // refresh). Stops once the assessment exists, the user is the host, or the
    // component unmounts.
    useEffect(() => {
        if (isHost || hasAssessment) return;
        const id = setInterval(() => loadData(true), 4000);
        return () => clearInterval(id);
    }, [isHost, hasAssessment, sessionId]);

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
        if (result.success) setSession({ ...session, isActive: !session.isActive });
    };

    const handleDeleteSession = async () => {
        if (!session) return;
        setIsDeleting(true);
        setDeleteError('');
        hideSessionForUser(user.id || user.name, session.id);
        setIsDeleting(false);
        onBack();
    };

    const openPreview = async () => {
        setPreviewOpen(true);
        setPreviewLoading(true);
        setPreviewError('');
        setPreviewData(null);
        const res = await getSessionAssessment(sessionId);
        setPreviewLoading(false);
        if (res.success && res.assessment) setPreviewData(res.assessment);
        else setPreviewError(res.error || 'Could not load the assessment preview');
    };

    const viewMyResult = () => {
        const rec = toStudentRecord(me.record, user.name);
        if (rec) onViewRecord(rec);
    };

    const completedMembers = members.filter((m) => m.status === 'completed');
    const totalMembers = members.length;
    const completionRate = totalMembers > 0 ? Math.round((completedMembers.length / totalMembers) * 100) : 0;

    const avgPerformance = completedMembers.length > 0
        ? completedMembers.reduce((s, m) => s + (m.record?.performanceScore || 0), 0) / completedMembers.length
        : 0;
    const avgAccuracy = completedMembers.length > 0
        ? completedMembers.reduce((s, m) => s + (m.record?.accuracyScore || 0), 0) / completedMembers.length
        : 0;
    const avgSpeed = completedMembers.length > 0
        ? completedMembers.reduce((s, m) => s + (m.record?.avgResponseTime || 0), 0) / completedMembers.length
        : 0;
    const peakScore = completedMembers.length > 0
        ? Math.max(...completedMembers.map((m) => m.record?.performanceScore || 0))
        : 0;

    // Calculate dominant group decision style / cognitive profile
    const styleCounts: Record<string, number> = {};
    completedMembers.forEach((m) => {
        const style = m.record?.primaryName || m.record?.decisionStyle || 'Balanced';
        styleCounts[style] = (styleCounts[style] || 0) + 1;
    });
    let dominantStyle = '--';
    let maxStyleCount = 0;
    Object.entries(styleCounts).forEach(([style, count]) => {
        if (count > maxStyleCount) {
            maxStyleCount = count;
            dominantStyle = style;
        }
    });

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
                    <button onClick={onBack} className="btn-primary">← Go Back</button>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen p-4 md:p-6 space-y-6 pb-16 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="btn-secondary !py-2 !px-3 text-sm">← Back</button>
            </div>

            {/* Session Info Card */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{session.title}</h1>
                        <p className="text-white/40 text-sm">
                            Hosted by {session.host.name} • {new Date(session.createdAt).toLocaleDateString()}
                            {isHost && <span className="ml-2 text-primary-300">• You are the host</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${session.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {session.isActive ? '🟢 Active' : '🔴 Closed'}
                        </span>
                        {isHost && (
                            <button onClick={handleToggleSession} className="btn-secondary !py-1.5 !px-3 text-xs">
                                {session.isActive ? 'Close Session' : 'Reopen Session'}
                            </button>
                        )}
                        <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary !py-1.5 !px-3 text-xs !text-red-400 hover:!bg-red-500/10">
                            🗑️ Delete
                        </button>
                    </div>
                </div>

                {/* Join Code */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                    <div className="flex-1">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Join Code</p>
                        <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary-400">{session.code}</p>
                    </div>
                    <button onClick={handleCopyCode} className="btn-secondary !py-2 !px-4 text-sm">
                        {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                </div>

                {/* Group Analytics & Insights Bar */}
                {members.length > 0 && (
                    <div className="pt-3 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider font-semibold text-white/50 flex items-center gap-1.5">
                                <span>📊</span> Group Insights & Analytics
                            </h3>
                            {completedMembers.length > 0 && (
                                <span className="text-[11px] text-primary-300 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                                    {completedMembers.length} of {totalMembers} Completed ({completionRate}%)
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                                <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                                    <span>👥 Joined</span>
                                    <span>🎯 {completionRate}%</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{totalMembers}</div>
                                <div className="text-[11px] text-white/40 mt-1">{completedMembers.length} completed</div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                                <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                                    <span>⚡ Avg Performance</span>
                                    <span>📈</span>
                                </div>
                                <div className="text-2xl font-bold text-emerald-400">
                                    {completedMembers.length > 0 ? `${Math.round(avgPerformance * 100)}%` : '--'}
                                </div>
                                <div className="text-[11px] text-white/40 mt-1">Group Score</div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                                <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                                    <span>🎯 Avg Accuracy</span>
                                    <span>✨</span>
                                </div>
                                <div className="text-2xl font-bold text-sky-400">
                                    {completedMembers.length > 0 ? `${Math.round(avgAccuracy * 100)}%` : '--'}
                                </div>
                                <div className="text-[11px] text-white/40 mt-1">Accuracy Ratio</div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                                <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                                    <span>⏱️ Avg Speed</span>
                                    <span>⌛</span>
                                </div>
                                <div className="text-2xl font-bold text-amber-400">
                                    {completedMembers.length > 0 ? `${avgSpeed.toFixed(1)}s` : '--'}
                                </div>
                                <div className="text-[11px] text-white/40 mt-1">Per Question</div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between col-span-2 sm:col-span-1">
                                <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                                    <span>🧠 Group Mindset</span>
                                    {completedMembers.length > 0 && peakScore > 0 && (
                                        <span className="text-[10px] text-emerald-400 font-semibold" title="Peak Score">
                                            🏆 {Math.round(peakScore * 100)}%
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm font-bold text-purple-300 truncate" title={dominantStyle}>
                                    {dominantStyle}
                                </div>
                                <div className="text-[11px] text-white/40 mt-1">Dominant Profile</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── HOST: Assessment authoring / management ─────────────────────── */}
            {isHost && (
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-lg font-semibold">📋 Session Assessment</h2>
                    {!hasAssessment ? (
                        <div className="text-center space-y-3 py-2">
                            <div className="text-3xl">🧩</div>
                            <p className="text-white/60 text-sm max-w-md mx-auto">
                                No assessment yet. Create the paper everyone in this session will take —
                                a custom exam (upload / manual / AI-generated) or an AI decision scenario.
                            </p>
                            <button onClick={() => onCreateAssessment(sessionId)} className="btn-primary !py-3 !px-8">
                                ➕ Create Assessment
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="font-semibold text-green-300">Assessment ready</p>
                                    <p className="text-xs text-white/50">{KIND_LABEL[assessmentKind || ''] || 'Assessment created'} — participants can take it now.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button onClick={openPreview} className="btn-secondary !py-2.5 !px-5">👁️ Preview</button>
                                <button onClick={() => onTakeAssessment(sessionId)} className="btn-primary !py-2.5 !px-5">✍️ {me.completed ? 'Re-attempt' : 'Attempt it myself'}</button>
                                {me.completed && me.record && (
                                    <button onClick={viewMyResult} className="btn-primary !py-2.5 !px-5 !bg-emerald-600 hover:!bg-emerald-500">📊 View My Result</button>
                                )}
                                <button onClick={() => onCreateAssessment(sessionId)} className="btn-secondary !py-2.5 !px-5 !text-amber-300 hover:!bg-amber-500/10">♻️ Replace</button>
                            </div>
                            <p className="text-[11px] text-white/40">
                                {me.completed ? '✅ You have completed your attempt for this session. Your score is listed at the top of the Participants list below.' : 'Attempting is optional — your own attempt is graded like any participant\'s.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── PARTICIPANT: wait / take / view own result ──────────────────── */}
            {!isHost && (
                <div className="glass-card p-6 text-center space-y-3">
                    {!hasAssessment ? (
                        <>
                            <div className="text-4xl animate-pulse">⏳</div>
                            <h2 className="text-lg font-semibold">Waiting for the host…</h2>
                            <p className="text-white/50 text-sm max-w-md mx-auto">
                                The host hasn't created the assessment yet. You're in — this screen updates
                                automatically the moment the host publishes it, and it'll appear right here.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-primary-300">
                                <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping"></span>
                                <span>Checking automatically…</span>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-1">
                                <button onClick={() => loadData()} className="btn-secondary !py-2 !px-5 text-sm">🔄 Check now</button>
                                <button onClick={onBack} className="btn-secondary !py-2 !px-5 text-sm">🚪 Exit</button>
                            </div>
                        </>
                    ) : me.completed ? (
                        <>
                            <div className="text-4xl">✅</div>
                            <h2 className="text-lg font-semibold">You've completed this assessment</h2>
                            <p className="text-white/50 text-sm">Your result has been shared with the host.</p>
                            {me.record && (
                                <button onClick={viewMyResult} className="btn-primary !py-2.5 !px-6">📊 View My Result</button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-3xl">🧠</div>
                            <h2 className="text-lg font-semibold">The assessment is ready</h2>
                            <p className="text-white/50 text-sm max-w-md mx-auto">
                                Complete the assessment for this session. Only you and the host will see your result.
                            </p>
                            <button
                                onClick={() => onTakeAssessment(sessionId)}
                                disabled={!session.isActive}
                                className="btn-primary !py-3 !px-8 disabled:opacity-50"
                            >
                                {session.isActive ? 'Start Assessment' : 'Session Closed'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── HOST: Participants + their results ──────────────────────────── */}
            {isHost && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            👥 Participants
                            <span className="text-white/40 text-sm font-normal ml-2">
                                ({completedMembers.length}/{members.length} completed)
                            </span>
                        </h2>
                        <button onClick={() => loadData()} className="btn-secondary !py-1.5 !px-3 text-xs">🔄 Refresh</button>
                    </div>

                    {members.length === 0 ? (
                        <div className="glass-card p-8 text-center space-y-3">
                            <div className="text-4xl">⏳</div>
                            <p className="text-white/50">
                                No participants yet. Share the join code{' '}
                                <span className="font-mono font-bold text-primary-400">{session.code}</span> with your students.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[...members]
                                .sort((a, b) => {
                                    const aIsHost = a.user.id === session.host.id;
                                    const bIsHost = b.user.id === session.host.id;
                                    if (aIsHost && a.status === 'completed') return -1;
                                    if (bIsHost && b.status === 'completed') return 1;
                                    if (aIsHost) return -1;
                                    if (bIsHost) return 1;
                                    if (a.status === 'completed' && b.status !== 'completed') return -1;
                                    if (a.status !== 'completed' && b.status === 'completed') return 1;
                                    return 0;
                                })
                                .map((member) => {
                                    const isHostMember = member.user.id === session.host.id;
                                    const displayName = isHostMember
                                        ? `${member.user.name} 👑 (Host)`
                                        : member.user.name;
                                    const record = toStudentRecord(member.record, displayName);
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
                                    return (
                                        <div key={member.id} className="w-full glass-card p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                                                {isHostMember ? '👑' : '⏳'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold">{displayName}</div>
                                                <div className="text-xs text-white/40">
                                                    Joined {new Date(member.joinedAt).toLocaleDateString()} • {hasAssessment ? 'Not attempted yet' : 'Waiting for assessment'}
                                                </div>
                                            </div>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Pending</span>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            )}

            {/* Preview Modal (host) */}
            {previewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="glass-card max-w-2xl w-full p-6 space-y-4 border border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">👁️ Assessment Preview</h2>
                            <button onClick={() => setPreviewOpen(false)} className="text-white/50 hover:text-white text-sm">✕ Close</button>
                        </div>
                        {previewLoading && <p className="text-white/50 text-sm">Loading…</p>}
                        {previewError && <p className="text-red-400 text-sm">⚠️ {previewError}</p>}
                        {previewData?.kind === 'custom-exam' && previewData.exam && (
                            <div className="space-y-3">
                                <p className="text-white/60 text-sm">{previewData.exam.examTitle} • {previewData.exam.totalMarks} marks • {previewData.exam.questions.length} questions</p>
                                {previewData.exam.questions.map((q: any, i: number) => (
                                    <div key={q.id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                        <p className="text-sm"><span className="text-white/40">Q{i + 1} ({q.marks}m · {q.type}).</span> {q.question}</p>
                                        {q.type === 'mcq' && q.options?.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2">
                                                {q.options.map((opt: string, oi: number) => (
                                                    <div key={oi} className="text-xs p-2 rounded-lg border border-white/10 bg-white/5 text-white/60">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                        {(q.type === 'short' || q.type === 'long') && (
                                            <p className="text-xs text-white/40 italic">✍️ {q.type === 'long' ? 'Long' : 'Short'} written answer</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {previewData?.kind === 'general-aptitude' && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                <p className="font-semibold">🧩 General Aptitude Test</p>
                                <p className="text-sm text-white/60">
                                    A 12-question mix of problem-solving &amp; reflection, general knowledge, logical,
                                    verbal and visual diagram puzzles. It is randomly generated for each participant,
                                    so there is no fixed paper to preview — every attempt differs and is auto-graded
                                    with an instant cognitive profile.
                                </p>
                            </div>
                        )}
                        {previewData?.kind === 'ai-scenario' && (
                            <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="font-semibold">{previewData.scenario?.title}</p>
                                    <p className="text-sm text-white/60 mt-1">{previewData.scenario?.description}</p>
                                </div>
                                {(previewData.questions || []).map((q: any, i: number) => (
                                    <div key={q.id ?? i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                        <p className="text-sm"><span className="text-white/40">Q{i + 1} ({q.type}).</span> {q.question}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Session Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-5 border border-red-500/20 shadow-2xl">
                        <div className="text-5xl">🗑️</div>
                        <h2 className="text-xl font-bold">Remove "{session.title}"?</h2>
                        <p className="text-sm text-white/60">
                            This will remove the session from your personal dashboard view. The session and all student results remain safely stored in the database for analytics.
                        </p>
                        {deleteError && <p className="text-red-400 text-sm">⚠️ {deleteError}</p>}
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="btn-secondary !py-2.5 !px-5 disabled:opacity-50">Cancel</button>
                            <button onClick={handleDeleteSession} disabled={isDeleting} className="btn-primary !py-2.5 !px-6 !bg-red-500 hover:!bg-red-600 disabled:opacity-50">
                                {isDeleting ? 'Removing...' : '🗑️ Remove from Dashboard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
