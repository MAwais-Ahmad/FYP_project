import { WelcomeScreen, QuizScreen, ResultsScreen } from './components';
import { useQuizState, useMetrics } from './hooks';

function App() {
    const {
        screen,
        isLoading,
        scenario,
        questions,
        currentQuestionIndex,
        answers,
        tokensUsed,
        totalCost,
        startQuiz,
        setAnswer,
        goToNextQuestion,
        goToPreviousQuestion,
        submitQuiz,
        restartQuiz,
        addCost,
    } = useQuizState();

    const {
        metrics,
        startQuiz: startMetrics,
        recordQuestionStart,
        recordFirstInteraction,
        recordAnswerChange,
        recordQuestionEnd,
        recordBacktrack,
        calculateOverallMetrics,
        resetMetrics,
    } = useMetrics();

    const handleStartQuiz = async () => {
        startMetrics();
        await startQuiz();
    };

    const handleRestart = () => {
        resetMetrics();
        restartQuiz();
    };

    // Extract question metrics for results screen
    const questionsMetrics = Object.fromEntries(
        Object.entries(metrics.questions).map(([id, m]) => [
            id,
            {
                totalTimeSpent: m.totalTimeSpent,
                timeToFirstInteraction: m.timeToFirstInteraction,
                answerChanges: m.answerChanges,
                responseLength: m.responseLength,
            }
        ])
    );

    return (
        <div className="app-container min-h-screen">
            {screen === 'welcome' && (
                <WelcomeScreen
                    onStart={handleStartQuiz}
                    isLoading={isLoading}
                />
            )}

            {screen === 'quiz' && scenario && (
                <QuizScreen
                    scenario={scenario}
                    questions={questions}
                    currentQuestionIndex={currentQuestionIndex}
                    answers={answers}
                    onAnswer={setAnswer}
                    onNext={goToNextQuestion}
                    onPrevious={goToPreviousQuestion}
                    onSubmit={submitQuiz}
                    onFirstInteraction={recordFirstInteraction}
                    onAnswerChange={recordAnswerChange}
                    onQuestionStart={recordQuestionStart}
                    onQuestionEnd={recordQuestionEnd}
                    onBacktrack={recordBacktrack}
                />
            )}

            {screen === 'results' && scenario && (
                <ResultsScreen
                    scenario={scenario}
                    questions={questions}
                    answers={answers}
                    calculateMetrics={calculateOverallMetrics}
                    questionsMetrics={questionsMetrics}
                    tokensUsed={tokensUsed}
                    totalCost={totalCost}
                    onAddCost={addCost}
                    onRestart={handleRestart}
                />
            )}
        </div>
    );
}

export default App;
