import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, pcmToGeminiBlob, base64ToUint8Array } from '../utils/audio';

const MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
const SYSTEM_INSTRUCTION = `
You are Sukoon, a warm, empathetic, and gentle mental health companion. 
You have exactly 30 seconds to assess the user. 
Start by briefly introducing yourself and asking how they feel. 
Ask short, focused questions about their mood, stress, sleep, or anxiety. 
Do not give long lectures; listen more than you talk.
Be comforting.
`;

export const useGeminiLive = (onTranscriptUpdate: (text: string, isUser: boolean) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false); // Model is speaking
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Session Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const disconnect = useCallback(() => {
    // Close context and nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    
    // Stop output audio
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Close session
    if (sessionPromiseRef.current) {
       sessionPromiseRef.current.then(session => {
          try { session.close(); } catch(e) {}
       });
       sessionPromiseRef.current = null;
    }

    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      
      // 1. Initialize Audio Contexts immediately
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      const outputCtx = outputAudioContextRef.current;
      outputNodeRef.current = outputCtx.createGain();
      outputNodeRef.current.connect(outputCtx.destination);
      
      // Analyzer for visualization
      analyserRef.current = outputCtx.createAnalyser();
      analyserRef.current.fftSize = 64;
      outputNodeRef.current.connect(analyserRef.current);

      // 2. Start Connection and Mic Access in Parallel
      // This reduces waiting time significantly
      
      // A. Start WebSocket Connection
      const sessionPromise = ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("Session Opened");
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
               setIsSpeaking(true);
               const ctx = outputAudioContextRef.current;
               if (ctx) {
                   nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                   
                   const audioBuffer = await decodeAudioData(
                     base64ToUint8Array(audioData),
                     ctx,
                     24000
                   );
                   
                   const source = ctx.createBufferSource();
                   source.buffer = audioBuffer;
                   source.connect(outputNodeRef.current!);
                   
                   source.addEventListener('ended', () => {
                     sourcesRef.current.delete(source);
                     if (sourcesRef.current.size === 0) setIsSpeaking(false);
                   });
                   
                   source.start(nextStartTimeRef.current);
                   nextStartTimeRef.current += audioBuffer.duration;
                   sourcesRef.current.add(source);
               }
            }
            
            // Handle Transcription
            if (message.serverContent?.outputTranscription?.text) {
                onTranscriptUpdate(message.serverContent.outputTranscription.text, false);
            }
            if (message.serverContent?.inputTranscription?.text) {
                onTranscriptUpdate(message.serverContent.inputTranscription.text, true);
            }

            // Handle interruptions
            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsSpeaking(false);
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setIsConnected(false);
          },
          onerror: (e) => {
            console.error(e);
            setError("Connection failed. Please try again.");
            disconnect();
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

      // B. Start Microphone Access
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone access is not supported in this browser.");
      }
      const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Wait for both to be ready
      const [session, stream] = await Promise.all([sessionPromise, streamPromise]);

      // 4. Setup Input Processing
      const inputCtx = inputAudioContextRef.current;
      if (inputCtx.state === 'suspended') {
          await inputCtx.resume();
      }

      inputSourceRef.current = inputCtx.createMediaStreamSource(stream);
      // Reduced buffer size to 2048 (approx 128ms) for lower latency
      processorRef.current = inputCtx.createScriptProcessor(2048, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const blob = pcmToGeminiBlob(inputData);
        session.sendRealtimeInput({ media: blob });
      };
      
      inputSourceRef.current.connect(processorRef.current);
      processorRef.current.connect(inputCtx.destination);

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          setError("Microphone permission denied. Please allow access.");
      } else {
          setError("Failed to connect. " + (err.message || ""));
      }
      disconnect();
    }
  }, [disconnect, onTranscriptUpdate]);

  return {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    error,
    analyser: analyserRef.current
  };
};