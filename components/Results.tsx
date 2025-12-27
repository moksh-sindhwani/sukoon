import React from 'react';
import { AnalysisResult } from '../types';

interface ResultsProps {
  result: AnalysisResult;
  onReset: () => void;
}

const Results: React.FC<ResultsProps> = ({ result, onReset }) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8 animate-slide-up">
      
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-light text-cyan-300">Your Sukoon Report</h2>
        <p className="text-slate-400">Here is what we gathered from our chat.</p>
      </div>

      {/* Status Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Mental State Analysis</h3>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-900 text-cyan-200 border border-cyan-700/50">
                {result.status}
            </span>
         </div>
         <p className="text-slate-300 leading-relaxed">
            {result.summary}
         </p>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white pl-2">Recommended for You</h3>
          <div className="grid gap-4 md:grid-cols-1">
             {result.recommendations.map((video, idx) => (
                 <a 
                    key={idx} 
                    href={video.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                 >
                    <div className="p-5 flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center text-red-500">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        </div>
                        <div>
                            <h4 className="text-lg font-medium text-white group-hover:text-cyan-300 transition-colors">
                                {video.title}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">
                                {video.description}
                            </p>
                            <span className="inline-block mt-3 text-xs text-cyan-500 font-semibold uppercase tracking-wider group-hover:underline">
                                Watch on YouTube &rarr;
                            </span>
                        </div>
                    </div>
                 </a>
             ))}
          </div>
      </div>

      <div className="flex justify-center pt-8">
          <button 
            onClick={onReset}
            className="px-8 py-3 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
             Start New Session
          </button>
      </div>

    </div>
  );
};

export default Results;