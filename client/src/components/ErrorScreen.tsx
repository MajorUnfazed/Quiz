interface ErrorScreenProps {
  onRetry: () => void;
}

export default function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div className="text-center max-w-lg mx-auto" data-testid="error-screen">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-slate-200/60">
        <div className="text-6xl mb-6">⚠️</div>
        
        <h2 className="font-bold text-3xl text-slate-700 mb-4" style={{ fontFamily: 'Karla, sans-serif' }}>
          Oops! Something went wrong
        </h2>
        
        <p className="text-lg text-slate-500 mb-8 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          We couldn't load the quiz questions. This might be due to a network issue or the trivia service being temporarily unavailable.
        </p>
        
        <button 
          onClick={onRetry}
          className="start-btn hover:shadow-lg active:shadow-inner transition-all duration-200"
          data-testid="button-retry"
        >
          🔄 Try Again
        </button>
        
        <p className="text-slate-400 text-sm mt-4">
          Don't worry, your progress is safe!
        </p>
      </div>
    </div>
  );
}
