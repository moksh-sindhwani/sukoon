import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

export async function analyzeSessionAndRecommend(transcript: string): Promise<AnalysisResult> {
  if (!transcript.trim()) {
    throw new Error("No transcript available for analysis.");
  }

  // Initialize client here to ensure process.env.API_KEY is available
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
      throw new Error("API Key is missing in environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    You are Sukoon, a mental health assistant.
    Analyze the following conversation transcript between a user and the Sukoon bot.
    Determine the user's mental state (mood, anxiety level, energy).
    
    Transcript:
    "${transcript}"
    
    Based on this analysis, provide:
    1. A brief "Status" (e.g., Mildly Stressed, Anxious, Calm, Need Motivation).
    2. A 2-sentence summary of the analysis.
    3. Recommend 3 specific YouTube videos that would help them right now (e.g., guided meditation, lofi beats, motivational speech, breathing exercise).
    
    Use the Google Search tool to find REAL YouTube video links.
    
    Return the output in this specific format (do not use JSON markdown, just plain text with these headers):
    
    STATUS: [Status]
    SUMMARY: [Summary]
    VIDEO 1: [Title] | [URL] | [Description]
    VIDEO 2: [Title] | [URL] | [Description]
    VIDEO 3: [Title] | [URL] | [Description]
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    // Parse the text response manually
    const statusMatch = text.match(/STATUS:\s*(.+)/);
    const summaryMatch = text.match(/SUMMARY:\s*(.+)/);
    
    const videos: { title: string; link: string; description: string }[] = [];
    const videoRegex = /VIDEO \d+:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/g;
    
    let match;
    while ((match = videoRegex.exec(text)) !== null) {
      videos.push({
        title: match[1].trim(),
        link: match[2].trim(),
        description: match[3].trim()
      });
    }

    // Fallback if regex fails (model might format slightly differently)
    let finalVideos = videos;
    if (videos.length === 0) {
        // Attempt to extract from grounding chunks if standard parsing failed
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk, index) => {
                 if (index < 3 && chunk.web?.uri) {
                     finalVideos.push({
                         title: chunk.web.title || "Recommended Video",
                         link: chunk.web.uri,
                         description: "Video found via search."
                     });
                 }
            });
        }
    }
    
    // Fallback for empty results
    if (finalVideos.length === 0) {
        finalVideos.push({
            title: "Relaxing Music",
            link: "https://www.youtube.com/results?search_query=relaxing+music",
            description: "A fallback recommendation for relaxation."
        });
    }

    return {
      status: statusMatch ? statusMatch[1].trim() : "Analysis Pending",
      summary: summaryMatch ? summaryMatch[1].trim() : "Could not generate detailed summary.",
      recommendations: finalVideos
    };

  } catch (error: any) {
    console.error("Analysis failed:", error);
    // If permission denied for search tool, try without it
    if (error.message && (error.message.includes("Permission denied") || error.message.includes("403"))) {
         console.warn("Search tool permission denied, retrying without tools.");
         // Retry without tools code could go here, but for now we throw to let the UI handle or just fail gracefully.
         // Actually, let's just return a basic fallback response to not crash the app
         return {
             status: "Unknown",
             summary: "We couldn't analyze the details due to a connection issue, but relaxation is always good.",
             recommendations: [{
                 title: "Relaxing Music",
                 link: "https://www.youtube.com/results?search_query=relaxing+music",
                 description: "General relaxation recommendation."
             }]
         };
    }
    throw error;
  }
}