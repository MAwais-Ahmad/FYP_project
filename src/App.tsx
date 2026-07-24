import { useState, useEffect } from 'react';
import {
    WelcomeScreen,
    AuthScreen,
    UserDashboard,
    SessionDashboard,
    RecordDetail,
    QuizScreen,
    ResultsScreen,
    InterScenarioScreen,
    AssessmentSetupScreen,
    CustomQuizScreen,
    CustomResultsScreen,
    GeneralQuizScreen,
    GeneralResultsScreen,
} from './components';
import { AIChatDrawer } from './components/ui/AIChatDrawer';
import { CustomExamResults } from './components/screens/CustomQuizScreen';
import { useQuizState, useGeneralQuiz, useMetrics } from './hooks';
import { AuthUser, getMe, logout as apiLogout, setSessionAssessment, getSessionAssessment } from './services/api';
import { StudentRecord } from './utils/storage';
import { GeneratedExam } from './types/quiz.types';

function App() {
    // Auth state
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    // True while the host is AUTHORING a session's assessment (vs taking one).
    const [authoringSession, setAuthoringSession] = useState(false);
    const [sessionBusy, setSessionBusy] = useState(false);
    const [sessionError, setSessionError] = useState('');

    // Dynamic Assessment state
    const [customExam, setCustomExam] = useState<GeneratedExam | null>(null);
    const [customExamResults, setCustomExamResults] = useState<CustomExamResults | null>(null);

    // Quiz state
    const {
        screen,
        setScreen,
        isLoading,
        scenario,
        questions,
        currentQuestionIndex,
        answers,
        currentScenarioNumber,
        scenarioResults,
        studentName,
        tokensUsed,
        totalCost,
        startQuiz,
        startPresetScenario,
        completeScenario,
        proceedToNextScenario,
        finishAssessment,
        setAnswer,
        goToNextQuestion,
        goToPreviousQuestion,
        goToQuestion,
        restartQuiz,
        goToWelcome,
    } = useQuizState();

    // General aptitude quiz (self-contained, sits alongside the scenario flow)
    const {
        gScenario,
        gQuestions,
        gCurrentIndex,
        gAnswers,
        gResult,
        gStudentName,
        gGenerating,
        startGeneralQuiz,
        completeGeneralQuiz,
        setGeneralAnswer,
        gNext,
        gPrev,
        gJumpTo,
        resetGeneral,
    } = useGeneralQuiz();

    const {
        metrics,
        startQuiz: startMetrics,
        recordQuestionStart,
        recordFirstInteraction,
        recordAnswerChange,
        recordQuestionEnd,
        recordFinalAnswer,
        recordBacktrack,
        calculateOverallMetrics,
        resetMetrics,
    } = useMetrics();

    // Connection state
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [verifyToken, setVerifyToken] = useState<string | null>(null);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Check for existing auth & parse resetToken/verifyToken on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const rToken = params.get('resetToken');
        const vToken = params.get('verifyToken');
        if (rToken) {
            setResetToken(rToken);
            setScreen('auth');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (vToken) {
            setVerifyToken(vToken);
            setScreen('auth');
        }

        getMe().then((result) => {
            if (result.success && result.user) {
                setCurrentUser(result.user);
                // If there's no resetToken/verifyToken in the URL, proceed to user dashboard
                if (!rToken && !vToken) {
                    setScreen('user-dashboard');
                }
            } else {
                // If not logged in and no token is present, force redirect to auth screen
                if (!rToken && !vToken) {
                    setScreen('auth');
                }
            }
            setAuthChecked(true);
        });
    }, []);

    // Auth handlers
    const handleAuthSuccess = (user: AuthUser) => {
        setCurrentUser(user);
        setScreen('user-dashboard');
    };

    const handleLogout = async () => {
        await apiLogout();
        setCurrentUser(null);
        setActiveSessionId(null);
        setSelectedRecord(null);
        setCustomExam(null);
        setCustomExamResults(null);
        resetGeneral();
        setScreen('auth');
    };

    // ── GENERAL APTITUDE QUIZ (self-contained flow) ───────────────────────────
    const handleStartGeneralQuiz = async () => {
        resetMetrics();
        startMetrics();
        // AI-generates the test (with local fallback); gGenerating drives the
        // loading overlay. Only switch screens once the questions are ready.
        await startGeneralQuiz(currentUser?.name || 'Anonymous');
        setScreen('general-quiz');
    };

    const handleGeneralAnswer = (questionId: number, answer: string | string[]) => {
        setGeneralAnswer(questionId, answer);
        let textVal = '';
        if (Array.isArray(answer)) {
            textVal = answer.join('');
        } else if (typeof answer === 'string') {
            textVal = answer.includes('|') ? (answer.split('|')[1] || '') : answer;
        }
        recordFinalAnswer(questionId, answer, textVal.length);
    };

    const handleCompleteGeneralQuiz = () => {
        const overall = calculateOverallMetrics();
        completeGeneralQuiz(overall, questionsMetrics);
        setScreen('general-results');
    };

    const handleGeneralRestart = () => {
        resetMetrics();
        resetGeneral();
        // A session participant lands back on the session dashboard; solo takers go
        // to their own dashboard (or the welcome screen as a guest).
        if (activeSessionId) {
            setScreen('session-dashboard');
        } else {
            setScreen(currentUser ? 'user-dashboard' : 'welcome');
        }
    };



    // Quiz handlers
    const handleStartQuiz = async (difficultyLevel: number, name: string) => {
        startMetrics();
        await startQuiz(difficultyLevel, name);
    };

    const handleStartSoloTest = () => {
        setScreen('assessment-setup');
    };

    // ── SESSION: host authors the assessment ──────────────────────────────────
    const handleCreateAssessment = (sessionId: string) => {
        setActiveSessionId(sessionId);
        setAuthoringSession(true);
        setSessionError('');
        setScreen('assessment-setup');
    };

    // Host finished building a custom exam → save it as the session's paper.
    const handleAuthorCustomExam = async (exam: GeneratedExam) => {
        if (!activeSessionId) return;
        setSessionBusy(true);
        setSessionError('');
        // For the examId path the paper lives server-side, so the timer settings
        // (set client-side) must be sent alongside it; the inline path already
        // carries them on the exam object.
        const payload = exam.examId
            ? { kind: 'custom-exam', examId: exam.examId, durationSeconds: exam.durationSeconds, timerMode: exam.timerMode }
            : { kind: 'custom-exam', exam };
        const res = await setSessionAssessment(activeSessionId, payload);
        setSessionBusy(false);
        if (res.success) {
            setAuthoringSession(false);
            setScreen('session-dashboard');
        } else {
            setSessionError(res.error || 'Failed to save the session assessment');
        }
    };

    // Host chose the General Aptitude Test → save it as the session's assessment.
    // There's no paper to build: each participant's client generates and grades its
    // own randomized attempt, so we only record the kind.
    const handleAuthorGeneralQuiz = async () => {
        if (!activeSessionId) return;
        setSessionBusy(true);
        setSessionError('');
        const res = await setSessionAssessment(activeSessionId, { kind: 'general-aptitude' });
        setSessionBusy(false);
        if (res.success) {
            setAuthoringSession(false);
            setScreen('session-dashboard');
        } else {
            setSessionError(res.error || 'Failed to save the session assessment');
        }
    };

    // ── SESSION: host or participant TAKES the authored assessment ─────────────
    const handleTakeAssessment = async (sessionId: string) => {
        setActiveSessionId(sessionId);
        setSessionBusy(true);
        setSessionError('');
        const res = await getSessionAssessment(sessionId);
        setSessionBusy(false);
        if (!res.success || !res.assessment) {
            setSessionError(res.error || 'The assessment is not available yet.');
            return;
        }
        const a = res.assessment;
        if (a.kind === 'custom-exam' && a.exam) {
            setCustomExam(a.exam); // stripped (no answer key); graded server-side via sessionId
            setScreen('custom-quiz');
        } else if (a.kind === 'ai-scenario') {
            startMetrics();
            startPresetScenario(a.scenario, a.questions, a.difficultyLevel || 5, currentUser?.name);
        } else if (a.kind === 'general-aptitude') {
            // Same self-contained General Aptitude flow as solo, but activeSessionId
            // stays set so the resulting record links back to this session.
            resetMetrics();
            startMetrics();
            await startGeneralQuiz(currentUser?.name || 'Anonymous');
            setScreen('general-quiz');
        } else {
            setSessionError('This assessment type is not supported.');
        }
    };

    // Custom Exam flow (new)
    const handleStartCustomExam = (exam: GeneratedExam) => {
        setCustomExam(exam);
        setScreen('custom-quiz');
    };

    const handleCustomExamComplete = (results: CustomExamResults) => {
        setCustomExamResults(results);
        setScreen('custom-results' as any);
    };

    const handleCompleteScenario = () => {
        const overall = calculateOverallMetrics();
        completeScenario(overall, questionsMetrics);
    };

    const handleProceedToNextScenario = async (newDifficulty: number) => {
        resetMetrics();
        startMetrics();
        await proceedToNextScenario(newDifficulty);
    };

    const handleRestart = () => {
        resetMetrics();
        setActiveSessionId(null);
        setAuthoringSession(false);
        setCustomExam(null);
        setCustomExamResults(null);
        if (currentUser) {
            setScreen('user-dashboard');
        } else {
            restartQuiz();
        }
    };

    // Abandon the in-progress scenario (mid-quiz exit). Unlike handleRestart,
    // this preserves activeSessionId so a host/participant exiting a session
    // test lands back on the session dashboard, not a generic one.
    const handleExitQuiz = () => {
        resetMetrics();
        setAuthoringSession(false);
        setCustomExam(null);
        restartQuiz();
        if (activeSessionId) {
            setScreen('session-dashboard');
        } else if (currentUser) {
            setScreen('user-dashboard');
        }
        // else: restartQuiz() already left screen at 'welcome', correct for a guest.
    };

    const handleViewRecord = (record: StudentRecord) => {
        setSelectedRecord(record);
        setScreen('record-detail');
    };

    const handleViewSession = (sessionId: string) => {
        setActiveSessionId(sessionId);
        setScreen('session-dashboard');
    };

    const handleBackFromDetail = () => {
        setSelectedRecord(null);
        if (activeSessionId) {
            setScreen('session-dashboard');
        } else if (currentUser) {
            setScreen('user-dashboard');
        } else {
            goToWelcome();
        }
    };

    const handleBackFromSession = () => {
        setActiveSessionId(null);
        if (currentUser) {
            setScreen('user-dashboard');
        } else {
            goToWelcome();
        }
    };

    const handleAnswer = (questionId: number, answer: string | string[]) => {
        setAnswer(questionId, answer);

        let textVal = '';
        if (Array.isArray(answer)) {
            textVal = answer.join('');
        } else if (typeof answer === 'string') {
            if (answer.includes('|')) {
                textVal = answer.split('|')[1] || '';
            } else {
                textVal = answer;
            }
        }

        recordFinalAnswer(questionId, answer, textVal.length);
    };

    const questionsMetrics = Object.fromEntries(
        Object.entries(metrics.questions).map(([id, m]) => [
            id,
            {
                totalTimeSpent: m.totalTimeSpent,
                timeToFirstInteraction: m.timeToFirstInteraction,
                answerChanges: m.answerChanges,
                responseLength: m.responseLength,
            },
        ])
    );

    // Don't render until auth check is done
    if (!authChecked) {
        return (
            <div className="app-container min-h-screen flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="text-4xl animate-spin">🧠</div>
                    <p className="text-white/50">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container min-h-screen">
            {/* General Aptitude Test — AI generation loading overlay */}
            {gGenerating && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-4 border border-white/10 shadow-2xl">
                        <div className="text-5xl animate-spin">🧠</div>
                        <h2 className="text-xl font-bold">Generating your aptitude test…</h2>
                        <p className="text-white/60 text-sm">The AI is crafting a fresh set of reasoning questions. This takes a few seconds.</p>
                    </div>
                </div>
            )}

            {/* Mid-Quiz Disconnect Warning Overlay */}
            {isOffline && screen === 'quiz' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fadeIn">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-4 border border-yellow-500/20 shadow-2xl">
                        <div className="text-5xl animate-bounce">⚠️</div>
                        <h2 className="text-2xl font-bold text-white">Network Signal Lost</h2>
                        <p className="text-white/60 text-sm leading-relaxed">
                            We cannot evaluate your cognitive features without a stable connection. Please reconnect to resume and ensure your final learning style classification remains accurate.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs text-yellow-400 font-semibold uppercase tracking-wider bg-yellow-500/10 py-2 px-3 rounded-lg border border-yellow-500/15">
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                            <span>Waiting for connection...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth Screen */}
            {screen === 'auth' && (
                <AuthScreen
                    onAuthSuccess={handleAuthSuccess}
                    resetToken={resetToken}
                    verifyToken={verifyToken}
                    onResetComplete={() => setResetToken(null)}
                    onVerifyComplete={() => setVerifyToken(null)}
                />
            )}

            {/* User Dashboard (logged in) */}
            {screen === 'user-dashboard' && currentUser && (
                <UserDashboard
                    user={currentUser}
                    onStartSoloTest={handleStartSoloTest}
                    onViewRecord={handleViewRecord}
                    onViewSession={handleViewSession}
                    onLogout={handleLogout}
                />
            )}

            {/* Assessment Setup Screen (Mode Selection) */}
            {screen === 'assessment-setup' && (
                <AssessmentSetupScreen
                    onStartCustomExam={handleStartCustomExam}
                    onStartGeneralQuiz={handleStartGeneralQuiz}
                    sessionAuthor={authoringSession}
                    onAuthorCustomExam={handleAuthorCustomExam}
                    onAuthorGeneralQuiz={handleAuthorGeneralQuiz}
                    onBack={() => {
                        setAuthoringSession(false);
                        if (activeSessionId) {
                            setScreen('session-dashboard');
                        } else if (currentUser) {
                            setScreen('user-dashboard');
                        } else {
                            goToWelcome();
                        }
                    }}
                    userName={currentUser?.name}
                />
            )}

            {/* Session busy / error overlay (authoring or loading an assessment) */}
            {(sessionBusy || sessionError) && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <div className="glass-card max-w-md w-full p-8 text-center space-y-4 border border-white/10 shadow-2xl">
                        {sessionBusy ? (
                            <>
                                <div className="text-5xl animate-spin">🤖</div>
                                <h2 className="text-xl font-bold">Working…</h2>
                                <p className="text-white/60 text-sm">Preparing the session assessment. This can take a few seconds.</p>
                            </>
                        ) : (
                            <>
                                <div className="text-5xl">⚠️</div>
                                <h2 className="text-xl font-bold">Something went wrong</h2>
                                <p className="text-white/60 text-sm">{sessionError}</p>
                                <button onClick={() => setSessionError('')} className="btn-primary !py-2.5 !px-6">OK</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Session Dashboard */}
            {screen === 'session-dashboard' && currentUser && activeSessionId && (
                <SessionDashboard
                    sessionId={activeSessionId}
                    user={currentUser}
                    onBack={handleBackFromSession}
                    onViewRecord={handleViewRecord}
                    onCreateAssessment={handleCreateAssessment}
                    onTakeAssessment={handleTakeAssessment}
                />
            )}

            {/* Record Detail */}
            {screen === 'record-detail' && selectedRecord && (
                <RecordDetail
                    record={selectedRecord}
                    onBack={handleBackFromDetail}
                />
            )}

            {/* Welcome Screen (guest or starting AI Scenario test) */}
            {screen === 'welcome' && (
                <WelcomeScreen
                    onStart={handleStartQuiz}
                    onViewAuth={() => setScreen('auth')}
                    onViewDashboard={currentUser ? () => setScreen('user-dashboard') : undefined}
                    onBack={() => setScreen('assessment-setup')}
                    isLoading={isLoading}
                    userName={currentUser?.name}
                    isOffline={isOffline}
                />
            )}

            {screen === 'quiz' && scenario && (
                <QuizScreen
                    scenario={scenario}
                    questions={questions}
                    currentQuestionIndex={currentQuestionIndex}
                    answers={answers}
                    currentScenarioNumber={currentScenarioNumber}
                    onAnswer={handleAnswer}
                    onNext={goToNextQuestion}
                    onPrevious={goToPreviousQuestion}
                    onJumpToQuestion={goToQuestion}
                    onCompleteScenario={handleCompleteScenario}
                    onFirstInteraction={recordFirstInteraction}
                    onAnswerChange={recordAnswerChange}
                    onQuestionStart={recordQuestionStart}
                    onQuestionEnd={recordQuestionEnd}
                    onBacktrack={recordBacktrack}
                    onExit={handleExitQuiz}
                />
            )}

            {screen === 'inter-scenario' && (
                <InterScenarioScreen
                    completedScenarioNumber={currentScenarioNumber}
                    scenarioResult={scenarioResults[scenarioResults.length - 1] ?? null}
                    isLoading={isLoading}
                    onContinue={handleProceedToNextScenario}
                    onFinish={finishAssessment}
                />
            )}

            {screen === 'results' && scenario && (
                <ResultsScreen
                    questions={questions}
                    calculateMetrics={calculateOverallMetrics}
                    questionsMetrics={questionsMetrics}
                    scenarioResults={scenarioResults}
                    studentName={studentName}
                    tokensUsed={tokensUsed}
                    totalCost={totalCost}
                    onRestart={handleRestart}
                    onViewDashboard={
                        currentUser
                            ? () => (activeSessionId ? setScreen('session-dashboard') : setScreen('user-dashboard'))
                            : undefined
                    }
                    sessionId={activeSessionId}
                />
            )}

            {/* General Aptitude Quiz Screen (self-contained flow) */}
            {screen === 'general-quiz' && gScenario && (
                <GeneralQuizScreen
                    scenario={gScenario}
                    questions={gQuestions}
                    currentQuestionIndex={gCurrentIndex}
                    answers={gAnswers}
                    onAnswer={handleGeneralAnswer}
                    onNext={gNext}
                    onPrevious={gPrev}
                    onJumpToQuestion={gJumpTo}
                    onCompleteScenario={handleCompleteGeneralQuiz}
                    onFirstInteraction={recordFirstInteraction}
                    onAnswerChange={recordAnswerChange}
                    onQuestionStart={recordQuestionStart}
                    onQuestionEnd={recordQuestionEnd}
                    onBacktrack={recordBacktrack}
                />
            )}

            {/* General Aptitude Results Screen */}
            {screen === 'general-results' && gResult && (
                <GeneralResultsScreen
                    questions={gQuestions}
                    calculateMetrics={calculateOverallMetrics}
                    questionsMetrics={questionsMetrics}
                    scenarioResults={[gResult]}
                    studentName={gStudentName || currentUser?.name || ''}
                    tokensUsed={0}
                    totalCost={0}
                    onRestart={handleGeneralRestart}
                    onViewDashboard={
                        currentUser ? () => (activeSessionId ? setScreen('session-dashboard') : setScreen('user-dashboard')) : undefined
                    }
                    sessionId={activeSessionId}
                />
            )}

            {/* Custom Exam Quiz Screen */}
            {screen === 'custom-quiz' && customExam && (
                <CustomQuizScreen
                    exam={customExam}
                    onComplete={handleCustomExamComplete}
                    onBack={handleExitQuiz}
                    sessionId={activeSessionId}
                />
            )}

            {/* Custom Exam Results Screen */}
            {(screen as string) === 'custom-results' && customExamResults && (
                <CustomResultsScreen
                    results={customExamResults}
                    onRestart={handleRestart}
                    onViewDashboard={
                        currentUser
                            ? () => (activeSessionId ? setScreen('session-dashboard') : setScreen('user-dashboard'))
                            : undefined
                    }
                    studentName={currentUser?.name}
                    sessionId={activeSessionId}
                />
            )}

            {/* Global AI Diagnostic Tutor Chatbot (Only available before & after assessment, hidden during active test session) */}
            {screen !== 'quiz' && (screen as string) !== 'custom-quiz' && screen !== 'general-quiz' && (
                <AIChatDrawer
                    recordContext={
                        selectedRecord ||
                        ((screen as string) === 'custom-results' && customExamResults ? customExamResults : null) ||
                        (scenarioResults.length > 0 ? { scenarioResults, studentName: studentName || currentUser?.name } : null) ||
                        customExamResults ||
                        gResult
                    }
                />
            )}
        </div>
    );
}

export default App;
