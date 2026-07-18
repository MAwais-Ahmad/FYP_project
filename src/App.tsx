import { useState, useEffect } from 'react';
import {
    WelcomeScreen,
    AuthScreen,
    UserDashboard,
    SessionDashboard,
    RecordDetail,
    QuizScreen,
    ResultsScreen,
} from './components';
import { useQuizState, useMetrics } from './hooks';
import { AuthUser, getMe, logout as apiLogout } from './services/api';
import { StudentRecord } from './utils/storage';

function App() {
    // Auth state
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // Quiz state
    const {
        screen,
        setScreen,
        isLoading,
        scenario,
        questions,
        currentQuestionIndex,
        answers,
        scenarioResults,
        studentName,
        tokensUsed,
        totalCost,
        startQuiz,
        completeScenario,
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
        setScreen('auth');
    };



    // Quiz handlers
    const handleStartQuiz = async (difficultyLevel: number, name: string) => {
        startMetrics();
        await startQuiz(difficultyLevel, name);
    };

    const handleStartSoloTest = () => {
        goToWelcome();
    };

    const handleStartSessionTest = (sessionId: string) => {
        setActiveSessionId(sessionId);
        goToWelcome();
    };

    const handleCompleteScenario = () => {
        const overall = calculateOverallMetrics();
        completeScenario(overall, questionsMetrics);
    };

    const handleRestart = () => {
        resetMetrics();
        setActiveSessionId(null);
        if (currentUser) {
            setScreen('user-dashboard');
        } else {
            restartQuiz();
        }
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

            {/* Welcome Screen (guest or starting a test) */}
            {screen === 'welcome' && (
                <WelcomeScreen
                    onStart={handleStartQuiz}
                    onViewAuth={() => setScreen('auth')}
                    onViewDashboard={currentUser ? () => setScreen('user-dashboard') : undefined}
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
        </div>
    );
}

export default App;
