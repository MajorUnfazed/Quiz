import { Question } from "@/pages/quiz";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DetailedResultsScreenProps {
  questions: Question[];
  userAnswers: Record<number, string>;
  botAnswers?: Record<number, string>;
  responseTime?: Record<number, number>;
  score: number;
  botScore?: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  isVsBot?: boolean;
}

export default function DetailedResultsScreen({
  questions,
  userAnswers,
  botAnswers,
  responseTime,
  score,
  botScore,
  onPlayAgain,
  onBackToMenu,
  isVsBot = false
}: DetailedResultsScreenProps) {
  
  const formatResponseTime = (time?: number) => {
    if (!time) return "N/A";
    return `${(time / 1000).toFixed(1)}s`;
  };

  const getScoreColor = (isCorrect: boolean) => {
    return isCorrect 
      ? "text-green-600 dark:text-green-400" 
      : "text-red-600 dark:text-red-400";
  };

  const getScoreIcon = (isCorrect: boolean) => {
    return isCorrect ? "✅" : "❌";
  };

  const calculateFinalScore = () => {
    if (!responseTime) return score;
    
    // Scoring formula: base score + time bonus
    let totalScore = score * 100; // 100 points per correct answer
    
    // Add time bonus for each correct answer (faster = more points)
    Object.entries(userAnswers).forEach(([questionIndex, userAnswer]) => {
      const question = questions[parseInt(questionIndex)];
      const isCorrect = userAnswer === question.correct_answer;
      const time = responseTime[parseInt(questionIndex)];
      
      if (isCorrect && time) {
        // Bonus: 50 points for answers under 10s, scaling down to 0 for 30s
        const timeBonus = Math.max(0, 50 - ((time / 1000 - 10) * 2.5));
        totalScore += Math.round(timeBonus);
      }
    });
    
    return Math.round(totalScore);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Detailed Results
        </h1>
        
        {/* Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-6 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Your Performance</h3>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {score}/{questions.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Correct Answers
            </div>
            {responseTime && (
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-2">
                Final Score: {calculateFinalScore()}
              </div>
            )}
          </Card>
          
          {isVsBot && (
            <Card className="p-6 bg-white dark:bg-slate-800 border-2 border-red-200 dark:border-red-700">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Bot Performance</h3>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {botScore}/{questions.length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Correct Answers
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Question by Question Review */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
          Question by Question Review
        </h2>
        
        {questions.map((question, index) => {
          const userAnswer = userAnswers[index];
          const botAnswer = botAnswers?.[index];
          const isUserCorrect = userAnswer === question.correct_answer;
          const isBotCorrect = botAnswer === question.correct_answer;
          const time = responseTime?.[index];
          
          return (
            <Card key={index} className="p-6 bg-white dark:bg-slate-800 border-l-4 border-l-indigo-500">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    {index + 1}
                  </span>
                  Question {index + 1}
                </h3>
                {time && (
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Response Time: {formatResponseTime(time)}
                  </div>
                )}
              </div>
              
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {decodeURIComponent(question.question)}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Answer */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">Your Answer:</h4>
                  <div className={`p-3 rounded-lg border-2 ${
                    isUserCorrect 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  }`}>
                    <span className={`${getScoreColor(isUserCorrect)} font-medium`}>
                      {getScoreIcon(isUserCorrect)} {userAnswer ? decodeURIComponent(userAnswer) : "No answer"}
                    </span>
                  </div>
                </div>
                
                {/* Bot Answer (if vs bot) */}
                {isVsBot && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">Bot Answer:</h4>
                    <div className={`p-3 rounded-lg border-2 ${
                      isBotCorrect 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                      <span className={`${getScoreColor(isBotCorrect)} font-medium`}>
                        {getScoreIcon(isBotCorrect)} {botAnswer ? decodeURIComponent(botAnswer) : "No answer"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Correct Answer */}
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">Correct Answer:</h4>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ {decodeURIComponent(question.correct_answer)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <Button 
          onClick={onPlayAgain}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          🎮 Play Again
        </Button>
        <Button 
          onClick={onBackToMenu}
          variant="outline"
          className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-3 text-lg font-semibold rounded-xl transition-all duration-200"
        >
          🏠 Back to Menu
        </Button>
      </div>
    </div>
  );
}
