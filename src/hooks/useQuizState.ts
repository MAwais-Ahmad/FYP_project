import { useState, useCallback } from 'react';
import { Scenario, Question, Answers, ScreenType } from '../types/quiz.types';
import { generateScenario as apiGenerateScenario } from '../services/api';

// Fallback data if API fails
const getFallbackData = (): { scenario: Scenario; questions: Question[] } => ({
    scenario: {
        title: "📋 The School Festival Budget Crisis",
        description: "You're helping organize your school's annual festival. As the student council treasurer, you must allocate limited funds fairly among multiple clubs.",
        budget: "Rs. 50,000",
        stakeholders: [
            { name: "Drama Club", request: "Rs. 20,000", purpose: "stage props and costumes" },
            { name: "Science Club", request: "Rs. 18,000", purpose: "experiment materials" },
            { name: "Sports Club", request: "Rs. 15,000", purpose: "equipment" },
            { name: "Art Club", request: "Rs. 12,000", purpose: "art supplies" },
            { name: "Music Club", request: "Rs. 10,000", purpose: "instruments rental" }
        ],
        constraint: "Total requests = Rs. 75,000 (Rs. 25,000 over budget!)",
        urgency: "Principal needs your recommendation by tomorrow morning."
    },
    questions: [
        { id: 1, phase: 1, phaseName: "Understanding", type: "text", timeLimit: 90, question: "Before solving any problem, we need to understand it clearly. In your own words, describe the CORE PROBLEM you're facing. What's at stake, and why is this decision difficult?", hint: "Think about: What makes this situation challenging? Who is affected?" },
        { id: 2, phase: 1, phaseName: "Understanding", type: "mcq", timeLimit: 60, question: "Good decision-making requires the right information. Which of the following would be MOST CRITICAL to know before making your budget allocation?", options: ["How much each club spent last year and their outcomes", "Which clubs have the most members", "Which club president is most persuasive", "The order in which requests were submitted"] },
        { id: 3, phase: 2, phaseName: "Planning", type: "multi-text", timeLimit: 120, question: "There's rarely just one way to solve a problem. Propose THREE different approaches to handle this budget shortfall. Be creative!", hint: "Consider: cutting costs, raising funds, compromising, prioritizing based on criteria, etc." },
        { id: 4, phase: 2, phaseName: "Planning", type: "ranking", timeLimit: 90, question: "Now evaluate your options. Rank your 3 solutions from BEST to WORST. Which approach best balances everyone's needs while staying within budget constraints?" },
        { id: 5, phase: 3, phaseName: "Execution", type: "mcq-urgent", timeLimit: 45, urgentUpdate: "🚨 BREAKING NEWS: Drama Club just found props at 40% discount - they now only need Rs. 12,000!", question: "You have 45 seconds to decide. What do you do with this new information?", options: ["Accept immediately - this frees up Rs. 8,000 for others!", "First verify the quality matches what was planned", "Stick to your original plan - last-minute changes complicate things", "Challenge other clubs to also find cheaper alternatives"] },
        { id: 6, phase: 3, phaseName: "Execution", type: "text", timeLimit: 0, context: "Final allocation: Drama Rs. 12k, Science Rs. 15k, Sports Rs. 12k, Art Rs. 8k, Music Rs. 3k. Music Club received the least.", question: "The Music Club president is upset about receiving only Rs. 3,000. How would you explain your decision with empathy while standing by your reasoning?" },
        { id: 7, phase: 4, phaseName: "Reflection", type: "reflection", timeLimit: 0, question: "Looking back at your entire decision-making journey: (1) Rate your confidence in your final allocation from 1-10. (2) If you could redo this process, what would you do differently?" }
    ]
});

export function useQuizState() {
    const [screen, setScreen] = useState<ScreenType>('welcome');
    const [isLoading, setIsLoading] = useState(false);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});
    const [tokensUsed, setTokensUsed] = useState(0);
    const [totalCost, setTotalCost] = useState(0);

    const currentQuestion = questions[currentQuestionIndex] || null;
    const totalQuestions = questions.length;
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    const generateQuiz = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiGenerateScenario();

            if (data.success) {
                setScenario(data.scenario);
                setQuestions(data.questions);
                setTokensUsed(prev => prev + data.usage.tokens);
                setTotalCost(prev => prev + data.usage.estimatedCost);
                console.log(`✅ Quiz generated! Tokens: ${data.usage.tokens} | Cost: ~$${data.usage.estimatedCost.toFixed(4)}`);
            } else {
                throw new Error(data.message || 'Failed to generate quiz');
            }
        } catch (error) {
            console.error('❌ Error generating quiz:', error);
            const fallback = getFallbackData();
            setScenario(fallback.scenario);
            setQuestions(fallback.questions);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const startQuiz = useCallback(async () => {
        await generateQuiz();
        setScreen('quiz');
    }, [generateQuiz]);

    const setAnswer = useCallback((questionId: number, answer: string | string[]) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer,
        }));
    }, []);

    const goToNextQuestion = useCallback(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [currentQuestionIndex, totalQuestions]);

    const goToPreviousQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    }, [currentQuestionIndex]);

    const submitQuiz = useCallback(() => {
        setScreen('results');
    }, []);

    const restartQuiz = useCallback(() => {
        setScreen('welcome');
        setScenario(null);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setAnswers({});
    }, []);

    const addCost = useCallback((tokens: number, cost: number) => {
        setTokensUsed(prev => prev + tokens);
        setTotalCost(prev => prev + cost);
    }, []);

    return {
        // State
        screen,
        isLoading,
        scenario,
        questions,
        currentQuestion,
        currentQuestionIndex,
        totalQuestions,
        answers,
        isFirstQuestion,
        isLastQuestion,
        tokensUsed,
        totalCost,

        // Actions
        startQuiz,
        setAnswer,
        goToNextQuestion,
        goToPreviousQuestion,
        submitQuiz,
        restartQuiz,
        addCost,
    };
}
