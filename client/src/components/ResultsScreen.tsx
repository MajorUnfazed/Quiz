import { useEffect } from "react";
import Confetti from "react-confetti";

interface ResultsScreenProps {
  score: number;
  total: number;
  onPlayAgain: () => void;
  onViewDetails?: () => void;
  user?: any;
  isBotMode?: boolean;
  botScore?: number;
}

export default function ResultsScreen({ score, total, onPlayAgain, onViewDetails, user, isBotMode = false, botScore }: ResultsScreenProps) {
  const isPerfectScore = score === total;

  useEffect(() => {
    // Clean up any existing confetti when component unmounts
    return () => {
      // Confetti cleanup is handled by the library
    };
  }, []);

  return (
    <div className="text-center max-w-2xl mx-auto" data-testid="results-screen">
      {isPerfectScore && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}
      
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-slate-200/60">
        <div className="mb-8">
          {isPerfectScore ? (
            <div className="text-6xl mb-4">🎉</div>
          ) : score >= 3 ? (
            <div className="text-6xl mb-4">🎯</div>
          ) : (
            <div className="text-6xl mb-4">📚</div>
          )}
          
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Karla, sans-serif' }}>
            {isPerfectScore ? "Perfect Score!" : score >= 3 ? "Great Job!" : "Nice Try!"}
          </h2>
        </div>
        
        <div className="results mb-8">
          You scored <span className="text-4xl font-bold text-indigo-600" data-testid="text-score">{score}</span>/{total} correct answers
          
          <div className="mt-4">
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div 
                className="h-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(score / total) * 100}%` }}
              ></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-2">{Math.round((score / total) * 100)}% accuracy</p>
            
            {isBotMode && botScore !== undefined && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-200">VS Bot Results</h3>
                <div className="flex justify-center items-center space-x-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">You: {score}</div>
                  </div>
                  <div className="text-2xl">⚔️</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">Bot: {botScore}</div>
                  </div>
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {score > botScore ? (
                    <span className="text-green-600 dark:text-green-400">🎉 You Won!</span>
                  ) : score < botScore ? (
                    <span className="text-red-600 dark:text-red-400">🤖 Bot Wins!</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">🤝 It's a Tie!</span>
                  )}
                </div>
              </div>
            )}
            
            {user && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-200">Points Earned</h3>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">+{score} points</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Total Score: {(user.totalScore || 0) + score}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onViewDetails && (
            <button 
              onClick={onViewDetails}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 hover:shadow-lg active:shadow-inner"
              data-testid="button-view-details"
            >
              📊 View Details
            </button>
          )}
          
          <button 
            onClick={onPlayAgain}
            className="new-game-btn hover:shadow-lg active:shadow-inner transition-all duration-200"
            data-testid="button-play-again"
          >
            🎮 Play Again
          </button>
        </div>
        
        {isPerfectScore && (
          <p className="text-slate-500 mt-4 text-sm">Amazing! You got every question right! 🌟</p>
        )}
      </div>
    </div>
  );
}
