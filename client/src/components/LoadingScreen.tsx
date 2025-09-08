import { useEffect } from "react";
import { Question } from "@/pages/quiz";
import { fetchTriviaQuestions, QuizConfig } from "@/lib/api";

interface LoadingScreenProps {
  config: QuizConfig;
  onComplete: (questions: Question[]) => void;
  onError: () => void;
}

export default function LoadingScreen({ config, onComplete, onError }: LoadingScreenProps) {
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const questions = await fetchTriviaQuestions(config);
        
        // Simulate 3 second loading delay as in original
        setTimeout(() => {
          onComplete(questions);
        }, 3000);
        
      } catch (error) {
        console.error('Error fetching questions:', error);
        setTimeout(() => {
          onError();
        }, 3000);
      }
    };

    fetchQuestions();
  }, [config, onComplete, onError]);

  return (
    <div className="text-center max-w-lg mx-auto" data-testid="loading-screen">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-slate-200/60">
        <div className="loading-spinner mx-auto mb-6"></div>
        <h3 className="text-2xl font-bold text-slate-700 mb-3" style={{ fontFamily: 'Karla, sans-serif' }}>
          Preparing Your Quiz
        </h3>
        <p className="text-lg text-slate-500 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          Fetching fresh trivia questions just for you...
        </p>
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
