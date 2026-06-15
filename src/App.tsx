import { WelcomeScreen, QuizScreen, ResultsScreen, InterScenarioScreen } from './components';
import { useQuizState, useMetrics } from './hooks';
import { Question, Answers } from './types/quiz.types';

function extractConfidence(answers: Answers, questions: Question[]): number {
    const reflectionQ = questions.find(q => q.type === 'reflection');
    if (!reflectionQ) return 5;
    const raw = (answers[reflectionQ.id] as string) || '';
    const [confStr] = raw.split('|');
    const parsed = parseInt(confStr);
    return Number.isNaN(parsed) ? 5 : Math.max(1, Math.min(10, parsed));
}

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
        tokensUsed,
        totalCost,
        startQuiz,
        completeScenario,
        proceedToNextScenario,
        finishAssessment,
        setAnswer,
        goToNextQuestion,
        goToPreviousQuestion,
        restartQuiz,
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

    const handleStartQuiz = async (difficultyLevel: number) => {
        startMetrics();
        await startQuiz(difficultyLevel);
    };

    const handleCompleteScenario = () => {
        const overall = calculateOverallMetrics();
        const confidence = extractConfidence(answers, questions);
        completeScenario(overall, confidence);
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
                <WelcomeScreen onStart={handleStartQuiz} isLoading={isLoading} />
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
                    answers={answers}
                    calculateMetrics={calculateOverallMetrics}
                    questionsMetrics={questionsMetrics}
                    scenarioResults={scenarioResults}
                    tokensUsed={tokensUsed}
                    totalCost={totalCost}
                    onRestart={handleRestart}
                />
            )}
        </div>
    );
}

export default App;
