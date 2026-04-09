import { useState, useRef } from 'react';
import { Mic, Send, Activity, BookOpen, BarChart3, Sparkles } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export default function App() {
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const analyzePitch = async () => {
    if (!pitch.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/analyze-pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch_text: pitch }),
      });
      const data = await response.json();
      setFeedback(data);
    } catch (error) {
      console.error("Failed to fetch feedback", error);
    }
    setLoading(false);
  };

  // --- NEW AUDIO LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Please allow microphone access to use this feature.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Turn off the microphone hardware indicator
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (audioBlob) => {
    setLoading(true);
    setPitch("Transcribing your audio..."); // UX feedback while Groq thinks
    
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "pitch.webm");

    try {
      const response = await fetch(`${API_URL}/analyze-audio`, {
        method: "POST",
        body: formData, // Fetch automatically sets the correct multipart boundary
      });
      const data = await response.json();
      
      setPitch(data.transcribed_text); // Set the textbox to what they actually said!
      setFeedback(data);
    } catch (error) {
      console.error("Failed to process audio", error);
      setPitch("Error processing audio. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 md:p-12 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-4">
            <Sparkles size={16} />
            <span>Powered by LangGraph & Groq Whisper</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
            Lingua<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">GO</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Your real-time, agentic public speaking coach. Type your pitch or click the mic to start practicing.
          </p>
        </div>

        {/* Input Area */}
        <div className="bg-slate-800/40 backdrop-blur-xl p-2 rounded-3xl border border-slate-700/50 shadow-2xl">
          <div className="bg-slate-900/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                 Draft Environment
              </label>
              
              {/* --- NEW DYNAMIC MIC BUTTON --- */}
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:scale-105'
                }`}
              >
                <Mic size={18} className={isRecording ? 'animate-bounce' : ''} />
                <span>{isRecording ? 'Stop Recording' : 'Use Voice'}</span>
              </button>
            </div>
            
            <textarea 
              className="w-full bg-transparent text-slate-100 placeholder:text-slate-600 text-lg resize-none focus:outline-none min-h-[160px]"
              placeholder="Hi everyone, today I want to introduce a solution that bridges the gap between..."
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              disabled={isRecording}
            />
            
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-700/50">
              <p className="text-slate-500 text-sm">
                {pitch.length} characters
              </p>
              <button 
                onClick={analyzePitch}
                disabled={loading || pitch.length === 0 || isRecording}
                className="group relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:hover:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing Agents...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <span>Analyze Pitch</span>
                    <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Scorecard */}
        {feedback && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="text-cyan-400" />
              Agentic Analysis Results
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
                <div className="w-32 h-32 rounded-full border-4 border-slate-700 flex items-center justify-center mb-6 relative">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-700" />
                    <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="364" strokeDashoffset={364 - (364 * feedback.final_score) / 100} className="text-cyan-400 transition-all duration-1000 ease-out" />
                  </svg>
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    {feedback.final_score}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Overall Impact</h3>
                <p className="text-slate-400 text-sm">Based on LangGraph multi-agent synthesis</p>
              </div>

              <div className="md:col-span-8 space-y-6">
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
                      <Activity size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">Pacing & Tone Analysis</h3>
                      <p className="text-slate-300 leading-relaxed">{feedback.pacing_feedback}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">Narrative Structure</h3>
                      <p className="text-slate-300 leading-relaxed">{feedback.narrative_feedback}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}