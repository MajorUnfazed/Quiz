import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import QuizPage from "@/pages/quiz";

function Router() {
  return (
    <Switch>
      <Route path="/" component={QuizPage} />
      <Route path="/quiz" component={QuizPage} />
    </Switch>
  );
}

import { useState, useEffect } from "react";
import { clientStorage, type Theme } from "./lib/storage";

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isThemeLoaded, setIsThemeLoaded] = useState<boolean>(false);

  // Load theme preference on app start
  useEffect(() => {
    const savedTheme = clientStorage.getTheme();
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    setIsThemeLoaded(true);
    
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Update theme when darkMode changes
  useEffect(() => {
    if (!isThemeLoaded) return; // Don't save during initial load
    
    const theme: Theme = darkMode ? 'dark' : 'light';
    clientStorage.saveTheme(theme);
    
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode, isThemeLoaded]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={toggleTheme}
            className="big-btn bg-gradient-to-r from-slate-800 to-indigo-900 dark:from-slate-200 dark:to-indigo-300 text-white dark:text-slate-900 shadow-lg px-6 py-2 rounded-xl font-bold hover:shadow-xl transition-all duration-200"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        </div>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
