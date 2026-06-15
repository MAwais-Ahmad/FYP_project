import {
    WelcomeScreen,
    QuizScreen,
    ResultsScreen,
    InterScenarioScreen,
    StudentDashboard,
    TeacherDashboard,
} from './components';
import { useQuizState, useMetrics } from './hooks';

function App() {
    const {
        screen,
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
        showStudentDashboard,
        showTeacherDashboard,
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

    const handleStartQuiz = async (difficultyLevel: number, name: string) => {
        startMetrics();
        await startQuiz(difficultyLevel, name);
    };

    const handleCompleteScenario = () => {
        const overall = calculateOverallMetrics();
        completeScenario(overall);
    };

    const handleProceedToNextScenario = async (newDifficulty: number) => {
        resetMetrics();
        startMetrics();
        await proceedToNextScenario(newDifficulty);
    };

    const handleRestart = () => {
        resetMetrics();
        restartQuiz();
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

    return (
        <div className="app-container min-h-screen">
            {screen === 'welcome' && (
                <WelcomeScreen
                    onStart={handleStartQuiz}
                    onViewTeacherDashboard={showTeacherDashboard}
                    onViewStudentDashboard={showStudentDashboard}
                    isLoading={isLoading}
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
                    onViewDashboard={showStudentDashboard}
                />
            )}

            {screen === 'student-dashboard' && (
                <StudentDashboard
                    studentName={studentName}
                    onBack={goToWelcome}
                    onStartNew={handleRestart}
                />
            )}

            {screen === 'teacher-dashboard' && (
                <TeacherDashboard onBack={goToWelcome} />
            )}
        </div>
    );
}

export default App;
