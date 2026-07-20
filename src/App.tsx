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
} from './components';
import { AIChatDrawer } from './components/ui/AIChatDrawer';
import { CustomExamResults } from './components/screens/CustomQuizScreen';
import { useQuizState, useMetrics } from './hooks';
import { AuthUser, getMe, logout as apiLogout } from './services/api';
import { StudentRecord } from './utils/storage';
import { GeneratedExam } from './types/quiz.types';

function App() {
    // Auth state
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

    // Check for existing auth & parse resetToken on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('resetToken');
        if (token) {
            setResetToken(token);
            setScreen('auth');
            // Clean up the URL search params for security
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        getMe().then((result) => {
            if (result.success && result.user) {
                setCurrentUser(result.user);
                // If there's no resetToken in the URL, proceed to user dashboard
                if (!token) {
                    setScreen('user-dashboard');
                }
            } else {
                // If not logged in and no resetToken is present, force redirect to auth screen
                if (!token) {
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
        goToWelcome();
    };



    // Quiz handlers
    const handleStartQuiz = async (difficultyLevel: number, name: string) => {
        startMetrics();
        await startQuiz(difficultyLevel, name);
    };

    const handleStartSoloTest = () => {
        setScreen('assessment-setup');
    };

    const handleStartSessionTest = (sessionId: string) => {
        setActiveSessionId(sessionId);
        setScreen('assessment-setup');
    };

    // AI Scenario flow (existing)
    const handleStartAIScenario = () => {
        goToWelcome();
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
                    onResetComplete={() => setResetToken(null)}
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
                    onStartAIScenario={handleStartAIScenario}
                    onStartCustomExam={handleStartCustomExam}
                    onBack={() => {
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

            {/* Session Dashboard */}
            {screen === 'session-dashboard' && currentUser && activeSessionId && (
                <SessionDashboard
                    sessionId={activeSessionId}
                    user={currentUser}
                    onBack={handleBackFromSession}
                    onViewRecord={handleViewRecord}
                    onStartSessionTest={handleStartSessionTest}
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
                            ? () => setScreen('user-dashboard')
                            : undefined
                    }
                />
            )}

            {/* Custom Exam Quiz Screen */}
            {screen === 'custom-quiz' && customExam && (
                <CustomQuizScreen
                    exam={customExam}
                    onComplete={handleCustomExamComplete}
                    onBack={handleRestart}
                />
            )}

            {/* Custom Exam Results Screen */}
            {(screen as string) === 'custom-results' && customExamResults && (
                <CustomResultsScreen
                    results={customExamResults}
                    onRestart={handleRestart}
                    onViewDashboard={
                        currentUser
                            ? () => setScreen('user-dashboard')
                            : undefined
                    }
                />
            )}

            {/* Global AI Diagnostic Tutor Chatbot (Only available before & after assessment, hidden during active test session) */}
            {screen !== 'quiz' && (screen as string) !== 'custom-quiz' && (
                <AIChatDrawer
                    recordContext={selectedRecord || customExamResults || (scenarioResults.length > 0 ? scenarioResults[scenarioResults.length - 1] : null)}
                />
            )}
        </div>
    );
}

export default App;
