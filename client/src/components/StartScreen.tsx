import { useState } from "react";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";


type BotDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface StartScreenProps {
  user: User;
  onStart: (multiplayer?: boolean, botDifficulty?: BotDifficulty) => void;
  onLogout: () => void;
  onViewLeaderboard?: () => void;
}

export default function StartScreen({ user, onStart, onLogout, onViewLeaderboard }: StartScreenProps) {
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('easy');
  const { toast } = useToast();

  const handleLogout = () => {
    toast({
      title: "Logged out successfully",
      description: "Your session has been cleared. See you next time!",
    });
    onLogout();
  };
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-slate-200/60 dark:border-slate-700 transform hover:scale-105 transition-all duration-500">
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <h1 className="font-bold text-7xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4" 
                style={{ fontFamily: 'Karla, sans-serif' }}>
              Quizzical
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full mb-6"></div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{user.avatar}</span>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {user.displayName}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{user.totalScore || 0} points</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              data-testid="button-logout"
            >
              Logout
            </button>
          </div>
        </div>
        
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          Welcome back, <strong>{user.displayName}</strong>! Ready to challenge your mind with engaging trivia?
          <br />
          <span className="text-sm text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 mt-2">
            🔒 Session active - preferences saved automatically
          </span>
          <br />
          <span className="text-lg text-slate-500 dark:text-slate-400">Choose your quiz adventure below.</span>
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => onStart()}
            className="start-btn hover:shadow-lg active:shadow-inner transition-all duration-200"
            data-testid="button-start-solo"
          >
            🚀 Solo Quiz
          </button>
          
          <div className="flex flex-col items-center">
            <button 
              onClick={() => onStart(true, botDifficulty)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 hover:shadow-lg active:shadow-inner mb-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
              data-testid="button-start-bot"
            >
              🤖 Play vs Bot
            </button>
            <div className="flex gap-2 mt-1">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Bot Difficulty:</label>
              <select
                value={botDifficulty}
                onChange={e => setBotDifficulty(e.target.value as BotDifficulty)}
                className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 transition-colors"
                data-testid="select-bot-difficulty"
              >
                <option value="easy" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Easy</option>
                <option value="medium" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Medium</option>
                <option value="hard" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Hard</option>
                <option value="expert" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Expert</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div className="mt-6 flex justify-center">
          {onViewLeaderboard && (
            <button 
              onClick={onViewLeaderboard}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg active:shadow-inner"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              🏆 Leaderboard
            </button>
          )}
        </div>
        
        <div className="mt-8 flex justify-center space-x-8 text-slate-400 dark:text-slate-500 text-sm">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            5 Questions
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
            Multiple Choice
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
            Mixed Topics
          </div>
        </div>
      </div>
    </div>
  );
}
