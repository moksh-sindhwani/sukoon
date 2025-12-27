import React, { useEffect, useState, useRef } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import Visualizer from './Visualizer';
import { Message } from '../types';

interface LiveSessionProps {
  onSessionEnd: (transcript: string) => void;
}

const SESSION_DURATION = 30; // seconds

const LiveSession: React.FC<LiveSessionProps> = ({ onSessionEnd }) => {
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const transcriptRef = useRef<Message[]>([]); // Ref to keep track for closure access
  
  // Callback to update transcript state
  const handleTranscriptUpdate = (text: string, isUser: boolean) => {
     // Simple debouncing/concatenating could be added here, 
     // but appending is fine for analysis purposes.
     const newMessage: Message = {
         id: Date.now().toString() + Math.random(),
         role: isUser ? 'user' : 'model',
         text,
         timestamp: Date.now()
     };
     
     setTranscript(prev => {
         const updated = [...prev, newMessage];
         transcriptRef.current = updated;
         return updated;
     });
  };

  const { connect, disconnect, isConnected, isSpeaking, analyser, error } = useGeminiLive(handleTranscriptUpdate);
  const hasStartedRef = useRef(false);

  // Auto-connect on mount
  useEffect(() => {
    if (!hasStartedRef.current) {
        connect();
        hasStartedRef.current = true;
    }
    return () => disconnect();
  }, [connect, disconnect]);

  // Timer Logic
  useEffect(() => {
    if (!isConnected) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected]);

  // Handle End of Session
  useEffect(() => {
    if (timeLeft === 0) {
      disconnect();
      // Format transcript for analysis service
      const fullText = transcriptRef.current
        .map(m => `${m.role.toUpperCase()}: ${m.text}`)
        .join('\n');
      onSessionEnd(fullText);
    }
  }, [timeLeft, disconnect, onSessionEnd]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full max-w-md mx-auto p-6 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-light text-cyan-300">Sukoon</h2>
        <p className="text-slate-400 text-sm">Your safe space is listening...</p>
      </div>

      {/* Visualizer Circle */}
      <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 border-4 
        ${isSpeaking ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]' : 'border-slate-700'}
        ${!isConnected && !error ? 'animate-pulse' : ''}
      `}>
         {isConnected ? (
             <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center relative">
                 <Visualizer analyser={analyser} isActive={isConnected} />
                 {/* Center icon */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="text-4xl">
                        {isSpeaking ? '🗣️' : '👂'}
                     </span>
                 </div>
             </div>
         ) : (
             <div className="text-slate-500">
                {error ? '❌' : 'Connecting...'}
             </div>
         )}
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center space-y-2">
        <div className="text-5xl font-mono font-bold text-white tracking-widest">
            {timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-widest">Seconds Remaining</span>
      </div>

      {/* Transcript Preview (Optional, last message) */}
      <div className="h-16 w-full flex items-center justify-center">
          {transcript.length > 0 && (
              <p className="text-center text-slate-400 text-sm italic line-clamp-2 px-4">
                  "{transcript[transcript.length - 1].text}"
              </p>
          )}
      </div>
      
      {error && (
          <div className="text-red-400 text-center text-sm bg-red-900/20 p-3 rounded-lg">
              {error} <br/>
              <button onClick={() => window.location.reload()} className="underline mt-2">Retry</button>
          </div>
      )}

    </div>
  );
};

export default LiveSession;