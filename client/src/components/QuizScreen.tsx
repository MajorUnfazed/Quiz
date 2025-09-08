import { useState, useEffect, useRef } from "react";
import { Question } from "@/pages/quiz";
import { shuffle } from "@/lib/shuffle";

// Sound effect assets (place correct.mp3 and wrong.mp3 in public/ or attached_assets/)
const CORRECT_SOUND = '/attached_assets/correct.mp3';
const WRONG_SOUND = '/attached_assets/wrong.mp3';
interface QuizScreenProps {
  questions: Question[];
  selectedAnswers: Record<number, string>;
  onAnswerSelect: (answers: Record<number, string>) => void;
  showAnswers: boolean;
  onCheckAnswers: (score: number, responseTime?: Record<number, number>) => void;
  user?: any;
  timerEnabled?: boolean;
}

export default function QuizScreen(props: QuizScreenProps) {
  const {
    questions,
    selectedAnswers,
    onAnswerSelect,
    showAnswers,
    onCheckAnswers,
    user,
    timerEnabled = false
  } = props;
// ...existing code...
  const [shuffledOptions, setShuffledOptions] = useState<Record<number, string[]>>({});
  const [answerFeedback, setAnswerFeedback] = useState<Record<number, 'correct' | 'incorrect' | null>>({});
  const [quizStartTime, setQuizStartTime] = useState<number>(Date.now());
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({});
  const [responseTime, setResponseTime] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(30); // 30 seconds per question
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const correctAudioRef = useRef<HTMLAudioElement>(null);
  const wrongAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Reset state when questions change to prevent stale data
    setAnswerFeedback({});
    setResponseTime({});
    setCurrentQuestionIndex(0);
    
    // Shuffle options for each question when questions load
    const shuffled: Record<number, string[]> = {};
    const startTimes: Record<number, number> = {};
    const now = Date.now();
    
    questions.forEach((question, index) => {
      const allOptions = [question.correct_answer, ...question.incorrect_answers];
      shuffled[index] = shuffle([...allOptions]);
      startTimes[index] = now;
    });
    
    setShuffledOptions(shuffled);
    setQuestionStartTimes(startTimes);
    setQuizStartTime(now);
    
    if (timerEnabled) {
      setTimeRemaining(30); // Reset timer for first question
    }
  }, [questions, timerEnabled]);

  // Timer countdown effect
  useEffect(() => {
    if (!timerEnabled || showAnswers) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - will trigger auto-submit in the next effect
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerEnabled, showAnswers, currentQuestionIndex]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timerEnabled && timeRemaining === 0 && !showAnswers) {
      handleCheckAnswers();
    }
  }, [timeRemaining, timerEnabled, showAnswers]);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    if (showAnswers) return;
    
    // Record response time
    const now = Date.now();
    const timeTaken = now - (questionStartTimes[questionIndex] || now);
    setResponseTime(prev => ({ ...prev, [questionIndex]: timeTaken }));
    
    const newAnswers = { ...selectedAnswers };
    newAnswers[questionIndex] = answer;
    onAnswerSelect(newAnswers);
    setAnswerFeedback((prev) => ({ ...prev, [questionIndex]: null }));
  };

  const handleCheckAnswers = async () => {
    let score = 0;
    const feedback: Record<number, 'correct' | 'incorrect'> = {};
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        score++;
        feedback[index] = 'correct';
      } else {
        feedback[index] = 'incorrect';
      }
    });
    
    // Don't set feedback immediately - let parent handle showAnswers first
    // setAnswerFeedback(feedback);
    
    // Update solo score (1 point per correct answer)
    if (user) {
      try {
        await fetch('/api/csrf-token', { credentials: 'include' });
        await fetch('/api/users/update-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
            pointsChange: score,
            isSoloMode: true
          })
        });
      } catch (error) {
        console.error('Failed to update solo score:', error);
      }
    }
    onCheckAnswers(score, responseTime);
  };

  // Effect to handle answer feedback when showAnswers becomes true
  useEffect(() => {
    if (showAnswers && questions.length > 0) {
      const feedback: Record<number, 'correct' | 'incorrect'> = {};
      questions.forEach((question, index) => {
        if (selectedAnswers[index] === question.correct_answer) {
          feedback[index] = 'correct';
        } else {
          feedback[index] = 'incorrect';
        }
      });
      setAnswerFeedback(feedback);
      
      // Play sound effects for each answer
      Object.entries(feedback).forEach(([idx, val]) => {
        setTimeout(() => {
          if (val === 'correct' && correctAudioRef.current) correctAudioRef.current.play();
          if (val === 'incorrect' && wrongAudioRef.current) wrongAudioRef.current.play();
        }, 200 * Number(idx));
      });
    }
  }, [showAnswers, questions, selectedAnswers]);

  const allQuestionsAnswered = questions.length > 0 && 
    Object.keys(selectedAnswers).length === questions.length;

  const getOptionClass = (questionIndex: number, option: string) => {
    const baseClass = "quiz-option";
    const isSelected = selectedAnswers[questionIndex] === option;
    const correctAnswer = questions[questionIndex].correct_answer;
    const feedback = answerFeedback[questionIndex];
    if (!showAnswers) {
      return `${baseClass} ${isSelected ? 'selected' : ''}`;
    }
    if (option === correctAnswer) {
      return `${baseClass} correct animated-correct ${feedback === 'correct' && isSelected ? 'pulse' : ''}`;
    } else if (isSelected && option !== correctAnswer) {
      return `${baseClass} incorrect animated-incorrect ${feedback === 'incorrect' ? 'shake' : ''}`;
    } else {
      return `${baseClass} disabled`;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      {/* Sound effect elements */}
      <audio ref={correctAudioRef} src={CORRECT_SOUND} preload="auto" />
      <audio ref={wrongAudioRef} src={WRONG_SOUND} preload="auto" />
      {/* Timer and Progress */}
      <div className="flex justify-between items-center py-4">
        <div className="font-bold text-lg text-indigo-600 dark:text-indigo-300">Quiz</div>
        {timerEnabled && (
          <div className="flex items-center space-x-4">
            {/* Progress indicator */}
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Progress:</span>
              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 ease-out"
                  style={{ width: `${(Object.keys(selectedAnswers).length / questions.length) * 100}%` }}
                />
              </div>
            </div>
            {/* Timer */}
            <div className={`timer px-4 py-2 rounded-xl text-lg font-mono shadow transition-colors ${
              timeRemaining <= 10 
                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 animate-pulse' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              ⏰ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}
        {!timerEnabled && (
          <div className="timer bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-lg font-mono shadow text-slate-600 dark:text-slate-400">
            📝 Take your time
          </div>
        )}
      </div>
      <div className="space-y-8">
        {questions.map((question, questionIndex) => (
          <div 
            key={questionIndex} 
            className="quiz" 
            data-testid={`question-${questionIndex}`}
            style={{ animationDelay: `${questionIndex * 0.1}s` }}
          >
            <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-base">
                  {questionIndex + 1}
                </div>
                <div className="question flex-1 text-base sm:text-lg font-semibold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-4 border border-slate-200 dark:border-slate-600 shadow-sm">
                  {decodeURIComponent(question.question)}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-0 sm:ml-12 items-start">
                {shuffledOptions[questionIndex]?.map((option, optionIndex) => (
                  <label 
                    key={optionIndex}
                    className={`${getOptionClass(questionIndex, option)} rounded-xl p-4 transition-all duration-200 cursor-pointer min-h-[60px] flex items-center justify-center text-center w-full`}
                    data-testid={`option-${questionIndex}-${optionIndex}`}
                    style={{ animationDelay: `${(questionIndex * 0.1) + (optionIndex * 0.05)}s` }}
                  >
                    <input
                      type="radio"
                      name={`question-${questionIndex}`}
                      value={option}
                      className="check-btn sr-only"
                      onChange={() => handleAnswerSelect(questionIndex, option)}
                      checked={selectedAnswers[questionIndex] === option}
                      disabled={showAnswers}
                    />
                    <span className="block text-base sm:text-lg font-medium leading-tight">
                      {decodeURIComponent(option)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-12 pb-8">
        {!showAnswers && (
          <>
            {timerEnabled ? (
              // With timer: require all questions answered
              !allQuestionsAnswered && (
                <div className="urge-to-select mb-6">
                  <p className="text-red-500 dark:text-red-400 font-semibold">Select all answers to continue</p>
                </div>
              )
            ) : (
              // Without timer: allow partial submission but encourage completion
              !allQuestionsAnswered && (
                <div className="urge-to-select mb-6">
                  <p className="text-yellow-600 dark:text-yellow-400 font-semibold">
                    {Object.keys(selectedAnswers).length > 0 
                      ? `${Object.keys(selectedAnswers).length}/${questions.length} questions answered`
                      : "Answer questions to get your score"
                    }
                  </p>
                </div>
              )
            )}
            <button 
              onClick={handleCheckAnswers}
              disabled={timerEnabled && !allQuestionsAnswered}
              className={`check-answers-btn hover:shadow-lg active:shadow-inner transition-all duration-200 ${
                timerEnabled && !allQuestionsAnswered 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              }`}
              data-testid="button-check-answers"
            >
              {timerEnabled ? 'Check Answers' : Object.keys(selectedAnswers).length > 0 ? 'Submit Quiz' : 'Submit (No Answers)'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
