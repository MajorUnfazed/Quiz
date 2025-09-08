import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, User, Bot } from "lucide-react";
import { Question } from "@/pages/quiz";
import { User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type BotDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
interface BotQuizScreenProps {
  user: UserType;
  questions: Question[];
  botDifficulty: BotDifficulty;
  onComplete: (playerScore: number, botScore: number) => void;
  onBack: () => void;
  onPlayAgain: () => void;
}

export default function BotQuizScreen({ user, questions, botDifficulty, onComplete, onBack, onPlayAgain }: BotQuizScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerAnswers, setPlayerAnswers] = useState<Record<number, string>>({});
  const [botAnswers, setBotAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [botAnswered, setBotAnswered] = useState(false);
  const [playerAnswered, setPlayerAnswered] = useState(false);
  
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Bot difficulty settings
  const botSettings = {
    easy:   { accuracy: 0.5, minDelay: 2000, maxDelay: 4000, points: 5, label: 'Easy' },
    medium: { accuracy: 0.7, minDelay: 1200, maxDelay: 2500, points: 10, label: 'Medium' },
    hard:   { accuracy: 0.9, minDelay: 700,  maxDelay: 1500, points: 20, label: 'Hard' },
    expert: { accuracy: 0.98, minDelay: 400, maxDelay: 900, points: 30, label: 'Expert' },
  }[botDifficulty];

  // Timer for each question
  useEffect(() => {
    setTimeLeft(15);
    setPlayerAnswered(false);
    setBotAnswered(false);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!playerAnswers[currentQuestionIndex]) {
            setPlayerAnswered(true);
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  // Bot answers based on difficulty
  useEffect(() => {
    setBotAnswered(false);
    const { accuracy, minDelay, maxDelay } = botSettings;
    const botDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    const botTimer = setTimeout(() => {
      if (!botAnswers[currentQuestionIndex]) {
        const allAnswers = [...currentQuestion.incorrect_answers, currentQuestion.correct_answer];
        let botAnswer;
        if (Math.random() < accuracy) {
          botAnswer = currentQuestion.correct_answer;
        } else {
          // Pick a random incorrect answer
          const incorrect = currentQuestion.incorrect_answers;
          botAnswer = incorrect[Math.floor(Math.random() * incorrect.length)];
        }
        setBotAnswers(prev => ({ ...prev, [currentQuestionIndex]: botAnswer }));
        setBotAnswered(true);
      }
    }, botDelay);
    return () => clearTimeout(botTimer);
    // eslint-disable-next-line
  }, [currentQuestionIndex, currentQuestion]);

  const handleAnswerSelect = (answer: string) => {
    if (playerAnswers[currentQuestionIndex]) return; // Already answered
    setPlayerAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
    setPlayerAnswered(true);
  };

  // Only go to next question after both have answered
  useEffect(() => {
    if (playerAnswered && botAnswered) {
      setTimeout(() => {
        if (isLastQuestion) {
          calculateFinalScores();
        } else {
          setCurrentQuestionIndex(prev => prev + 1);
        }
      }, 900);
    }
    // eslint-disable-next-line
  }, [playerAnswered, botAnswered]);

  const calculateFinalScores = () => {
    let pScore = 0;
    let bScore = 0;
    questions.forEach((question, index) => {
      if (playerAnswers[index] === question.correct_answer) pScore++;
      if (botAnswers[index] === question.correct_answer) bScore++;
    });
    setPlayerScore(pScore);
    setBotScore(bScore);
    setShowResult(true);
    // Points scale with bot difficulty
    let pointsChange = 0;
    if (pScore > bScore) pointsChange = botSettings.points;
    else if (pScore < bScore) pointsChange = -Math.ceil(botSettings.points / 2);
    updateUserScore(pointsChange);
  };

  const updateUserScore = async (pointsChange: number) => {
    try {
      await apiRequest('POST', '/api/users/update-score', {
        userId: user.id,
        pointsChange
      });
    } catch (error) {
      console.error('Failed to update score:', error);
    }
  };

  const allAnswers = currentQuestion ? [...currentQuestion.incorrect_answers, currentQuestion.correct_answer].sort() : [];

  if (showResult) {
    const won = playerScore > botScore;
    let pointsEarned = 0;
    if (won) pointsEarned = botSettings.points;
    else if (playerScore < botScore) pointsEarned = -Math.ceil(botSettings.points / 2);
    else pointsEarned = 0;

    return (
      <div className="min-h-screen p-6">
        <div className="blob-top"></div>
        <div className="blob-bottom"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Card className="text-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700">
            <CardContent className="p-8">
              <div className="mb-6">
                <Trophy className={`w-16 h-16 mx-auto mb-4 ${won ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`} />
                <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                  {won ? 'Victory!' : playerScore === botScore ? 'Draw!' : 'Defeat!'}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  {won ? `You beat the ${botSettings.label} Bot!` : 
                   playerScore === botScore ? 'You tied with the bot!' : 
                   `The ${botSettings.label} Bot wins this round!`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">{user.avatar}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{user.displayName}</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{playerScore}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Your Score</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Bot className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Quiz Bot</span>
                  </div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{botScore}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Bot Score</div>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-lg text-slate-900 dark:text-slate-100">
                  Points: <span className={`font-bold ${pointsEarned > 0 ? 'text-green-600 dark:text-green-400' : pointsEarned < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {pointsEarned > 0 ? '+' : ''}{pointsEarned}
                  </span>
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={onPlayAgain} size="lg" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                  Play Again
                </Button>
                <Button onClick={onBack} variant="outline" size="lg" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Back to Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="blob-top"></div>
      <div className="blob-bottom"></div>
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{user.avatar}</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{user.displayName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Score: {playerScore}</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              {currentQuestionIndex + 1} / {questions.length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">vs Quiz Bot</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Play vs Bot</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Quiz Bot</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Score: {botScore}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress and Timer */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Progress</span>
            <span className="text-sm text-slate-600 dark:text-slate-300">Time: {timeLeft}s</span>
          </div>
          <Progress value={(currentQuestionIndex / questions.length) * 100} className="mb-4" />
          <Progress value={(timeLeft / 15) * 100} className="h-2" />
        </div>

        {/* Question */}
        <Card className="mb-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold mb-8 text-center leading-relaxed bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
              dangerouslySetInnerHTML={{ __html: currentQuestion.question }}>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAnswers.map((answer, index) => {
                const isSelected = playerAnswers[currentQuestionIndex] === answer;
                const isCorrect = answer === currentQuestion.correct_answer;
                const playerAnswered = !!playerAnswers[currentQuestionIndex];
                const botSelected = botAnswers[currentQuestionIndex] === answer;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={playerAnswered}
                    className={`p-6 rounded-xl border-2 transition-all duration-300 text-left relative ${
                      playerAnswered
                        ? isSelected
                          ? isCorrect 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100'
                            : 'border-red-500 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100'
                          : isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                    data-testid={`answer-${index}`}
                  >
                    <span dangerouslySetInnerHTML={{ __html: answer }} />
                    {/* Show bot selection */}
                    {botSelected && (
                      <div className="absolute top-2 right-2">
                        <Bot className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                    )}
                    {/* Show user selection */}
                    {isSelected && (
                      <div className="absolute top-2 left-2">
                        <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}