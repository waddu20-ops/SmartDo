
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

interface VoiceAssistantProps {
  onTaskDetected: (taskTitle: string, dueDate?: string, priority?: 'high' | 'medium') => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onTaskDetected }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
  }, []);

  const addTaskFunctionDeclaration: FunctionDeclaration = {
    name: 'add_calendar_task',
    parameters: {
      type: Type.OBJECT,
      description: 'Add a task to the calendar with an optional day, time, and importance level.',
      properties: {
        title: {
          type: Type.STRING,
          description: 'The description of the task.',
        },
        day: {
          type: Type.STRING,
          description: 'The day of the week (e.g., Monday, Tuesday, today, tomorrow).',
        },
        time: {
          type: Type.STRING,
          description: 'The time of day (e.g., 2 PM, 14:00, noon).',
        },
        importance: {
          type: Type.STRING,
          description: 'Is it a "major" or "minor" task?',
          enum: ['major', 'minor'],
        }
      },
      required: ['title'],
    },
  };

  const startSession = async () => {
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [addTaskFunctionDeclaration] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: 'You are SmartDo, a warm and gentle productivity companion. When users mention something they need to do, acknowledge it supportively. Use "add_calendar_task" to capture details. If they sound urgent or say it is important, mark it as "major".',
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then((session) => {
                if (sessionRef.current) {
                   session.sendRealtimeInput({ media: pcmBlob });
                }
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'add_calendar_task') {
                  const { title, day, time, importance } = fc.args as any;
                  let dueDate: string | undefined;
                  try {
                    const now = new Date();
                    const targetDate = new Date();
                    if (day) {
                      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const targetDayIndex = days.indexOf(day.toLowerCase());
                      if (targetDayIndex !== -1) {
                        const currentDayIndex = now.getDay();
                        let diff = targetDayIndex - currentDayIndex;
                        if (diff < 0) diff += 7;
                        targetDate.setDate(now.getDate() + diff);
                      }
                    }
                    if (time) {
                       const match = time.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
                       if (match) {
                         let hours = parseInt(match[1]);
                         const minutes = parseInt(match[2] || "0");
                         const meridiem = match[3]?.toUpperCase();
                         if (meridiem === 'PM' && hours < 12) hours += 12;
                         if (meridiem === 'AM' && hours === 12) hours = 0;
                         targetDate.setHours(hours, minutes, 0, 0);
                       }
                    } else {
                      targetDate.setHours(9, 0, 0, 0);
                    }
                    dueDate = targetDate.toISOString();
                  } catch (e) {
                    console.error("Failed to parse date:", e);
                  }

                  onTaskDetected(title, dueDate, importance === 'major' ? 'high' : 'medium');
                  
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Task successfully SmartDo-ed into the list!" }
                      }]
                    });
                  });
                }
              }
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              setIsSpeaking(true);
              const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              };
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopSession();
          },
          onclose: () => {
            stopSession();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice:", err);
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
          isActive 
            ? 'bg-rose-500 hover:bg-rose-600 scale-110' 
            : 'bg-indigo-500 hover:bg-indigo-600'
        } ${isConnecting ? 'animate-pulse opacity-70' : ''}`}
        aria-label="Voice Assistant"
      >
        {isConnecting ? (
          <i className="fas fa-spinner fa-spin text-white text-2xl"></i>
        ) : isActive ? (
          <div className="relative">
            <i className="fas fa-microphone-slash text-white text-2xl"></i>
            {isSpeaking && (
              <div className="absolute -inset-4 rounded-full border-4 border-rose-300 animate-ping opacity-50"></div>
            )}
          </div>
        ) : (
          <i className="fas fa-microphone text-white text-2xl"></i>
        )}
      </button>
      
      {isActive && !isConnecting && (
        <div className="absolute bottom-20 left-0 bg-white p-4 rounded-2xl shadow-2xl glass-panel w-64 border border-rose-100 animate-bounce-subtle">
          <p className="text-sm text-rose-600 font-medium mb-1">SmartDo is listening...</p>
          <p className="text-xs text-gray-500">"Add urgent report for Monday at 2 PM"</p>
        </div>
      )}
    </div>
  );
};

export default VoiceAssistant;