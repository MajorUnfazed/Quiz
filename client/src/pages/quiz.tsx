import { useState, useEffect } from "react";
import StartScreen from "@/components/StartScreen";
import AuthScreen from "@/components/AuthScreen";
import BotQuizScreen from "@/components/BotQuizScreen";
import QuizConfigScreen, { QuizConfig } from "@/components/QuizConfigScreen";
import QuizScreen from "@/components/QuizScreen";
import LoadingScreen from "@/components/LoadingScreen";
import ResultsScreen from "@/components/ResultsScreen";
import DetailedResultsScreen from "@/components/DetailedResultsScreen";
import LeaderboardScreen from "@/components/LeaderboardScreen";
import ErrorScreen from "@/components/ErrorScreen";
import { User } from "@shared/schema";
import { clientStorage } from "@/lib/storage";

export interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  type: string;
  difficulty: string;
}

export type QuizState = 'auth' | 'start' | 'configure' | 'loading' | 'quiz' | 'bot-quiz' | 'results' | 'detailed-results' | 'leaderboard' | 'error';

export default function QuizPage() {
  const [currentState, setCurrentState] = useState<QuizState>('auth');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [botAnswers, setBotAnswers] = useState<Record<number, string>>({});
  const [responseTime, setResponseTime] = useState<Record<number, number>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({ amount: 10, category: 0, difficulty: 'any', timer: true });
  const [isBotMode, setIsBotMode] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');

  // Check for existing session on component mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await clientStorage.validateSession();
        if (user) {
          setCurrentUser(user);
          setCurrentState('start');
        } else {
          setCurrentState('auth');
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        setCurrentState('auth');
      } finally {
        setIsSessionLoading(false);
      }
    };

    restoreSession();
  }, []);

  const resetQuiz = () => {
    setCurrentState('start');
    setQuestions([]);
    setSelectedAnswers({});
    setScore(0);
    setBotScore(0);
    setBotAnswers({});
    setResponseTime({});
    setShowAnswers(false);
    setIsBotMode(false);
    setBotDifficulty('easy');
  };

  const handleAuth = (user: User) => {
    setCurrentUser(user);
    clientStorage.saveUser(user); // Persist user session
    setCurrentState('start');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clientStorage.clearAll(); // Clear persisted session
    setCurrentState('auth');
    resetQuiz();
  };

  const handleViewLeaderboard = () => {
    setCurrentState('leaderboard');
  };

  const handleViewDetailedResults = () => {
    setCurrentState('detailed-results');
  };

  const handleStartQuiz = (botMode?: boolean, difficulty?: 'easy' | 'medium' | 'hard' | 'expert') => {
    // Reset all game state before starting a new game
    setQuestions([]);
    setSelectedAnswers({});
    setScore(0);
    setBotScore(0);
    setBotAnswers({});
    setResponseTime({});
    setShowAnswers(false);
    
    if (botMode) {
      // Start Play vs Bot mode
      setIsBotMode(true);
      setBotDifficulty(difficulty || 'easy');
      setQuizConfig({ amount: 10, category: 0, difficulty: 'any', timer: true });
      startBotQuiz(difficulty || 'easy');
    } else {
      setIsBotMode(false);
      setCurrentState('configure');
    }
  };

  const handleConfigureQuiz = (config: QuizConfig) => {
    setQuizConfig(config);
    setCurrentState('loading');
    // Remove duplicate fetchQuestions call - let LoadingScreen handle it
  };

  const fetchQuestions = async (config: QuizConfig) => {
    try {
      const params = new URLSearchParams({
        amount: config.amount.toString(),
        type: "multiple",
        encode: "url3986",
        ...(config.category !== 0 && { category: config.category.toString() }),
        ...(config.difficulty !== 'any' && { difficulty: config.difficulty })
      });
      const response = await fetch(`https://opentdb.com/api.php?${params}`);
      const data = await response.json();
      if (data.response_code === 0 && data.results) {
        const decodedResults = data.results.map((question: any) => ({
          ...question,
          question: decodeURIComponent(question.question),
          correct_answer: decodeURIComponent(question.correct_answer),
          incorrect_answers: question.incorrect_answers.map((answer: string) => decodeURIComponent(answer))
        }));
        setQuestions(decodedResults);
        setCurrentState('quiz');
      } else {
        setCurrentState('error');
      }
    } catch (error) {
      setCurrentState('error');
    }
  };

  const startBotQuiz = async (difficulty?: 'easy' | 'medium' | 'hard' | 'expert') => {
    setCurrentState('loading');
    try {
      const params = new URLSearchParams({
        amount: quizConfig.amount.toString(),
        type: "multiple",
        encode: "url3986",
        ...(quizConfig.category !== 0 && { category: quizConfig.category.toString() }),
        ...(quizConfig.difficulty !== 'any' && { difficulty: quizConfig.difficulty })
      });
      const response = await fetch(`https://opentdb.com/api.php?${params}`);
      const data = await response.json();
      if (data.response_code === 0 && data.results) {
        const decodedResults = data.results.map((question: any) => ({
          ...question,
          question: decodeURIComponent(question.question),
          correct_answer: decodeURIComponent(question.correct_answer),
          incorrect_answers: question.incorrect_answers.map((answer: string) => decodeURIComponent(answer))
        }));
        setQuestions(decodedResults);
        setCurrentState('bot-quiz');
      } else {
        setCurrentState('error');
      }
    } catch (error) {
      setCurrentState('error');
    }
  };

  const handleBotQuizComplete = async (playerScore: number, botScore: number, playerAnswers?: Record<number, string>, botAnswers?: Record<number, string>) => {
    setScore(playerScore);
    setBotScore(botScore);
    if (playerAnswers) setSelectedAnswers(playerAnswers);
    if (botAnswers) setBotAnswers(botAnswers);
    
    // Refresh user data to show updated points
    try {
      const response = await fetch(`/api/users/${currentUser?.id}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
    
    setCurrentState('results');
  };

  const handleQuizComplete = async (finalScore: number, responseTimeData?: Record<number, number>) => {
    setScore(finalScore);
    if (responseTimeData) setResponseTime(responseTimeData);
    setShowAnswers(true);
    
    // Save solo result to backend for leaderboard
    if (currentUser && !isBotMode) {
      try {
        // Calculate stats from current quiz
        const correctAnswers = Object.keys(selectedAnswers).reduce((count, index) => {
          const questionIndex = parseInt(index);
          if (questions[questionIndex] && selectedAnswers[questionIndex] === questions[questionIndex].correct_answer) {
            return count + 1;
          }
          return count;
        }, 0);

        const totalQuestions = questions.length;
        
        // Calculate average response time
        let averageTime = null;
        if (responseTimeData && Object.keys(responseTimeData).length > 0) {
          // Use total time from start of quiz divided by total questions
          const totalTime = Object.values(responseTimeData).reduce((sum, time) => sum + time, 0);
          // Convert from milliseconds to seconds and divide by total questions
          averageTime = Math.round((totalTime / totalQuestions) / 1000 * 10) / 10; // Round to 1 decimal place
        }

        await fetch('/api/csrf-token', { credentials: 'include' });
        await fetch('/api/solo/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: currentUser.id,
            score: finalScore,
            correctAnswers,
            totalQuestions,
            averageTime,
            difficulty: quizConfig.difficulty,
            category: quizConfig.category,
            config: quizConfig
          })
        });
      } catch (error) {
        console.error('Failed to save solo result:', error);
        // Don't block UI for save failures
      }
    }
    
    setCurrentState('results');
  };

  const handleBackToStart = () => {
    setIsBotMode(false);
    setCurrentState('start');
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Blobs */}
      <div className="blob-top"></div>
      <div className="blob-bottom"></div>
      
      {/* Main Content */}
      <div className="relative z-10">
        {/* Show loading screen while checking session */}
        {isSessionLoading && (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                Restoring Session...
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Checking your login status
              </p>
            </div>
          </div>
        )}

        {!isSessionLoading && (currentState === 'auth' || currentState === 'start' || currentState === 'configure' || currentState === 'loading' || currentState === 'results' || currentState === 'detailed-results' || currentState === 'leaderboard' || currentState === 'error') && (
          <div className="min-h-screen flex items-center justify-center p-6">
            {currentState === 'auth' && (
              <AuthScreen onAuth={handleAuth} />
            )}
            
            {currentState === 'start' && currentUser && (
              <StartScreen 
                user={currentUser}
                onStart={handleStartQuiz}
                onLogout={handleLogout}
                onViewLeaderboard={handleViewLeaderboard}
              />
            )}
            
            {currentState === 'configure' && (
              <QuizConfigScreen 
                onStartQuiz={handleConfigureQuiz}
                onBack={() => setCurrentState('start')}
              />
            )}
            
            {currentState === 'loading' && (
              <LoadingScreen 
                config={quizConfig}
                onComplete={(fetchedQuestions) => {
                  setQuestions(fetchedQuestions);
                  // Prevent going back to quiz if answers are already submitted
                  if (!showAnswers) {
                    setCurrentState(isBotMode ? 'bot-quiz' : 'quiz');
                  } else {
                    // If answers are already submitted, go to results instead
                    setCurrentState('results');
                  }
                }}
                onError={() => setCurrentState('error')}
              />
            )}
            
            {currentState === 'results' && (
              <ResultsScreen 
                score={score}
                total={quizConfig.amount}
                onPlayAgain={resetQuiz}
                onViewDetails={handleViewDetailedResults}
                user={currentUser}
                isBotMode={isBotMode}
                botScore={botScore}
              />
            )}

            {currentState === 'detailed-results' && (
              <DetailedResultsScreen
                questions={questions}
                userAnswers={selectedAnswers}
                botAnswers={isBotMode ? botAnswers : undefined}
                responseTime={responseTime}
                score={score}
                botScore={isBotMode ? botScore : undefined}
                onPlayAgain={resetQuiz}
                onBackToMenu={() => setCurrentState('start')}
                isVsBot={isBotMode}
              />
            )}

            {currentState === 'leaderboard' && (
              <LeaderboardScreen
                onBack={() => setCurrentState('start')}
                currentUser={currentUser}
              />
            )}
            
            {currentState === 'error' && (
              <ErrorScreen 
                onRetry={resetQuiz}
              />
            )}
          </div>
        )}
        
        {!isSessionLoading && currentState === 'quiz' && (
          <div className="py-8">
            <QuizScreen 
              questions={questions}
              selectedAnswers={selectedAnswers}
              onAnswerSelect={setSelectedAnswers}
              showAnswers={showAnswers}
              user={currentUser}
              timerEnabled={quizConfig.timer}
              onCheckAnswers={handleQuizComplete}
            />
          </div>
        )}

        {!isSessionLoading && currentState === 'bot-quiz' && currentUser && (
          <BotQuizScreen 
            user={currentUser}
            questions={questions}
            botDifficulty={botDifficulty}
            onComplete={handleBotQuizComplete}
            onBack={handleBackToStart}
            onPlayAgain={() => {
              startBotQuiz(botDifficulty);
            }}
          />
        )}
      </div>
    </div>
  );
}
