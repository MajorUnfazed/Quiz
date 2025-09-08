import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  averageTime: number;
  difficulty: string;
  category: string;
  timestamp: Date;
}

interface LeaderboardScreenProps {
  onBack: () => void;
  currentUser?: any;
}

export default function LeaderboardScreen({ onBack, currentUser }: LeaderboardScreenProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/leaderboard/solo?limit=50', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();
        // Convert timestamp strings to Date objects
        const processedData = data.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setLeaderboard(processedData);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setError('Failed to load leaderboard');
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const filteredLeaderboard = leaderboard.filter(entry => 
    selectedDifficulty === 'all' || entry.difficulty === selectedDifficulty
  ).sort((a, b) => b.score - a.score);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'hard': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  const getDifficultyEmoji = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  };

  const formatDate = (timestamp: Date) => {
    return timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Leaderboard</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Button onClick={onBack} className="bg-indigo-600 hover:bg-indigo-700">
            Back to Start
          </Button>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-slate-400 text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Solo Results Yet</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Be the first to complete a solo quiz and appear on the leaderboard!
          </p>
          <Button onClick={onBack} className="bg-indigo-600 hover:bg-indigo-700">
            Start Playing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          🏆 Solo Mode Leaderboard
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Top scores from solo quiz challenges - show your knowledge!
        </p>
      </div>

      {/* Difficulty Filter */}
      <div className="mb-6 flex justify-center">
        <div className="w-64">
          <Select value={selectedDifficulty} onValueChange={(value) => setSelectedDifficulty(value as any)}>
            <SelectTrigger className="h-12 text-lg bg-white dark:bg-slate-800 border-2 dark:border-slate-700">
              <SelectValue placeholder="Filter by difficulty" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-2 dark:border-slate-700">
              <SelectItem value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                🎯 All Difficulties
              </SelectItem>
              <SelectItem value="easy" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                🟢 Easy
              </SelectItem>
              <SelectItem value="medium" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                🟡 Medium
              </SelectItem>
              <SelectItem value="hard" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                🔴 Hard
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leaderboard */}
      <Card className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-6 text-center">
            Top Performers
            {selectedDifficulty !== 'all' && (
              <span className="ml-2 text-lg">
                {getDifficultyEmoji(selectedDifficulty)} {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
              </span>
            )}
          </h2>
          
          {filteredLeaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                No scores found for this difficulty level.
              </p>
              <p className="text-slate-500 dark:text-slate-500 mt-2">
                Be the first to set a record!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeaderboard.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    entry.username === currentUser?.username 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-800' 
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {/* Rank and User Info */}
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{entry.avatar}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-semibold text-lg ${
                            entry.id === currentUser?.id 
                              ? 'text-indigo-700 dark:text-indigo-300' 
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {entry.displayName}
                            {entry.id === currentUser?.id && (
                              <span className="ml-2 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-400">
                          <span className={`px-2 py-1 rounded-full font-medium ${getDifficultyColor(entry.difficulty)}`}>
                            {getDifficultyEmoji(entry.difficulty)} {entry.difficulty}
                          </span>
                          <span>{entry.category}</span>
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-right">
                    <div>
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {entry.score}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">Score</div>
                    </div>
                    
                    <div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {entry.correctAnswers}/{entry.totalQuestions}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">Correct</div>
                    </div>
                    
                    <div>
                      <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                        {entry.averageTime.toFixed(1)}s
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">Avg Time</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Scoring Formula Info */}
      <Card className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-2 border-indigo-200 dark:border-indigo-700">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
          <span className="text-xl mr-2">📊</span>
          Scoring Formula
        </h3>
        <div className="text-slate-600 dark:text-slate-300 space-y-2 text-sm">
          <p><strong>Base Score:</strong> 100 points per correct answer</p>
          <p><strong>Speed Bonus:</strong> Up to 50 extra points for answers under 10 seconds</p>
          <p><strong>Time Penalty:</strong> Bonus decreases as response time increases (0 bonus at 30+ seconds)</p>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium">💡 Answer quickly and accurately to maximize your score!</p>
        </div>
      </Card>

      {/* Back Button */}
      <div className="flex justify-center mt-8">
        <Button 
          onClick={onBack}
          variant="outline"
          className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-3 text-lg font-semibold rounded-xl transition-all duration-200"
        >
          🏠 Back to Menu
        </Button>
      </div>
    </div>
  );
}
