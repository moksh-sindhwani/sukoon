import React, { useState } from 'react';
import LiveSession from './components/LiveSession';
import Results from './components/Results';
import { analyzeSessionAndRecommend } from './services/geminiService';
import { AnalysisResult, AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const startSession = () => {
    setAppState(AppState.LIVE);
  };

  const handleSessionEnd = async (transcript: string) => {
    setAppState(AppState.ANALYZING);
    try {
        // If transcript is empty (user didn't say anything), handle gracefully
        const safeTranscript = transcript || "User was silent throughout the session.";
        const result = await analyzeSessionAndRecommend(safeTranscript);
        setAnalysisResult(result);
        setAppState(AppState.RESULTS);
    } catch (e) {
        console.error(e);
        alert("Something went wrong analyzing the session. Please try again.");
        setAppState(AppState.IDLE);
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]"></div>
      </div>

      <main className="flex-grow z-10 flex flex-col items-center justify-center p-4">
        
        {appState === AppState.IDLE && (
           <div className="text-center space-y-8 animate-fade-in max-w-lg">
              <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <span className="text-4xl">🕊️</span>
              </div>
              
              <h1 className="text-5xl font-light tracking-tight text-white">
                Sukoon Bot
              </h1>
              
              <p className="text-lg text-slate-400 leading-relaxed">
                Take 30 seconds to talk about how you feel. We'll listen, analyze, and find the perfect videos to help you find your peace.
              </p>

              <button 
                onClick={startSession}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-white transition-all duration-200 bg-cyan-600 font-lg rounded-full hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-600 focus:ring-offset-slate-900"
              >
                <span className="mr-2 text-xl">🎙️</span> Start Conversation
                <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:scale-105 transition-transform"></div>
              </button>
              
              <p className="text-xs text-slate-600 mt-8">
                 Requires Microphone Access • Powered by Gemini 2.5 Live
              </p>
           </div>
        )}

        {appState === AppState.LIVE && (
            <LiveSession onSessionEnd={handleSessionEnd} />
        )}

        {appState === AppState.ANALYZING && (
            <div className="text-center animate-pulse space-y-4">
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h3 className="text-2xl font-light text-cyan-200">Analyzing your words...</h3>
                <p className="text-slate-500">Finding the best content for you.</p>
            </div>
        )}

        {appState === AppState.RESULTS && analysisResult && (
            <Results result={analysisResult} onReset={reset} />
        )}

      </main>

      <footer className="z-10 py-6 text-center text-slate-600 text-xs">
          <p>Not a substitute for professional mental health advice. If you are in crisis, please call emergency services.</p>
      </footer>
    </div>
  );
};

export default App;