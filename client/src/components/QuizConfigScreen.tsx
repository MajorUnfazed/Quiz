import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { clientStorage } from "@/lib/storage";

export interface QuizConfig {
  amount: number;
  category: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'any';
  timer?: boolean;
}

interface QuizConfigScreenProps {
  onStartQuiz: (config: QuizConfig) => void;
  onBack: () => void;
}

interface Category {
  id: number;
  name: string;
}

const difficulties = [
  { value: 'any' as const, name: 'Any Difficulty' },
  { value: 'easy' as const, name: 'Easy' },
  { value: 'medium' as const, name: 'Medium' },
  { value: 'hard' as const, name: 'Hard' }
];

const questionAmounts = [5, 10, 15, 20, 25];

export default function QuizConfigScreen({ onStartQuiz, onBack }: QuizConfigScreenProps) {
  // Load preferences and set initial config
  const getInitialConfig = (): QuizConfig => {
    const preferences = clientStorage.getPreferences();
    if (preferences.defaultQuizConfig) {
      return {
        ...preferences.defaultQuizConfig,
        timer: preferences.defaultQuizConfig.timer ?? true // Ensure timer is always boolean
      };
    }
    return {
      amount: 5,
      category: 0,
      difficulty: 'any',
      timer: true
    };
  };

  const [config, setConfig] = useState<QuizConfig>(getInitialConfig());
  
  const [categories, setCategories] = useState<Category[]>([
    { id: 0, name: 'Any Category' }
  ]);
  
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch categories from OpenTDB API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('https://opentdb.com/api_category.php');
        const data = await response.json();
        
        const fetchedCategories: Category[] = [
          { id: 0, name: 'Any Category' },
          ...data.trivia_categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name
          }))
        ];
        
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Fallback to hardcoded categories
        setCategories([
          { id: 0, name: 'Any Category' },
          { id: 9, name: 'General Knowledge' },
          { id: 17, name: 'Science & Nature' },
          { id: 18, name: 'Science: Computers' },
          { id: 21, name: 'Sports' },
          { id: 22, name: 'Geography' },
          { id: 23, name: 'History' },
        ]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleStartQuiz = () => {
    // Save config as user preference
    const preferences = clientStorage.getPreferences();
    const updatedPreferences = {
      ...preferences,
      defaultQuizConfig: config
    };
    clientStorage.savePreferences(updatedPreferences);
    
    onStartQuiz(config);
  };

  const getCategoryIcon = (categoryId: number) => {
    const iconMap: Record<number, string> = {
      0: '🎯',
      9: '🧠',
      10: '📚',
      11: '🎬',
      12: '🎵',
      13: '🎭',
      14: '📺',
      15: '🎮',
      16: '🎲',
      17: '🔬',
      18: '💻',
      19: '🔢',
      20: '⚡',
      21: '⚽',
      22: '🌍',
      23: '📜',
      24: '🏛️',
      25: '🎨',
      26: '⭐',
      27: '🐾',
      28: '🚗',
      29: '💥',
      30: '📱',
      31: '🌸',
      32: '🎨'
    };
    return iconMap[categoryId] || '❓';
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '🎯';
    }
  };

  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-slate-200/60 dark:border-slate-700">
        <div className="mb-8">
          <h2 className="font-bold text-4xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4" 
              style={{ fontFamily: 'Karla, sans-serif' }}>
            Customize Your Quiz
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full mb-6"></div>
          <p className="text-lg text-slate-600 dark:text-slate-300" style={{ fontFamily: 'Inter, sans-serif' }}>
            Choose your preferences for the perfect quiz experience
          </p>
        </div>

        <div className="space-y-8 text-left">
          {/* Number of Questions */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
              <span className="text-2xl mr-3">📝</span>
              Number of Questions
            </Label>
            <Select 
              value={config.amount.toString()} 
              onValueChange={(value) => setConfig({ ...config, amount: parseInt(value) })}
            >
              <SelectTrigger className="h-12 text-lg bg-white dark:bg-slate-800 border-2 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-400 transition-colors dark:text-slate-100">
                <SelectValue placeholder="Select number of questions" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-2 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                {questionAmounts.map((amount) => (
                  <SelectItem key={amount} value={amount.toString()} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {amount} Questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
              <span className="text-2xl mr-3">🎪</span>
              Category
            </Label>
            <Select 
              value={config.category.toString()} 
              onValueChange={(value) => setConfig({ ...config, category: parseInt(value) })}
              disabled={isLoadingCategories}
            >
              <SelectTrigger className="h-12 text-lg bg-white dark:bg-slate-800 border-2 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-400 transition-colors dark:text-slate-100">
                <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"} />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-white dark:bg-slate-800 border-2 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <div className="flex items-center">
                      <span className="mr-2">{getCategoryIcon(category.id)}</span>
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
              <span className="text-2xl mr-3">💪</span>
              Difficulty
            </Label>
            <Select 
              value={config.difficulty} 
              onValueChange={(value) => setConfig({ ...config, difficulty: value as QuizConfig['difficulty'] })}
            >
              <SelectTrigger className="h-12 text-lg bg-white dark:bg-slate-800 border-2 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-400 transition-colors dark:text-slate-100">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-2 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty.value} value={difficulty.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <div className="flex items-center">
                      <span className="mr-2">{getDifficultyIcon(difficulty.value)}</span>
                      {difficulty.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timer Toggle */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
              <span className="text-2xl mr-3">⏱️</span>
              Quiz Timer
            </Label>
            <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl">
              <Switch
                checked={config.timer}
                onCheckedChange={(checked) => setConfig({ ...config, timer: checked })}
                className="data-[state=checked]:bg-indigo-600"
              />
              <span className="text-slate-600 dark:text-slate-300">
                {config.timer ? 'Timer enabled - adds pressure and scoring bonus!' : 'No timer - take your time answering'}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
  <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-indigo-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-slate-100 mb-2">Quiz Summary:</h3>
          <div className="text-slate-600 dark:text-slate-300 space-y-1">
            <p>📝 <strong>{config.amount}</strong> questions</p>
            <p>🎪 <strong>{categories.find(c => c.id === config.category)?.name}</strong></p>
            <p>💪 <strong>{difficulties.find(d => d.value === config.difficulty)?.name}</strong> difficulty</p>
            <p>⏱️ <strong>{config.timer ? 'Timer Enabled' : 'No Timer'}</strong></p>
          </div>
        </div>

        {/* Buttons */}
  <div className="flex gap-4 justify-center mt-8">
          <Button 
            onClick={onBack}
            variant="outline"
            className="px-8 py-3 text-lg h-auto border-2 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500 dark:text-slate-100 transition-colors"
            data-testid="button-back"
          >
            ← Back
          </Button>
          <button 
            onClick={handleStartQuiz}
            className="start-btn hover:shadow-lg active:shadow-inner transition-all duration-200 dark:bg-gradient-to-r dark:from-indigo-900 dark:to-purple-900 dark:text-slate-100"
            data-testid="button-start-configured-quiz"
          >
            🚀 Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
}