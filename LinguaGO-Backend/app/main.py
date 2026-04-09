from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agents.graph import lingua_graph
from groq import Groq
import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="LinguaGO API", version="2.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class PitchRequest(BaseModel):
    pitch_text: str

@app.post("/analyze-pitch")
async def analyze_pitch(request: PitchRequest):
    # Your existing text endpoint logic
    try:
        # Fully initialize the state to prevent KeyErrors in LangGraph
        initial_state = {
            "raw_pitch": request.pitch_text,
            "pacing_feedback": "",
            "narrative_feedback": "",
            "final_score": 0
        }
        
        # Invoke the LangGraph workflow
        result = lingua_graph.invoke(initial_state)
        return {
            "status": "success",
            "pacing_feedback": result.get("pacing_feedback"),
            "narrative_feedback": result.get("narrative_feedback"),
            "final_score": result.get("final_score")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-audio")
async def analyze_audio(audio_file: UploadFile = File(...)):
    try:
        # 1. Save the audio blob temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(await audio_file.read())
            temp_audio_path = temp_audio.name

        # 2. Send to Groq Whisper for transcription
        with open(temp_audio_path, "rb") as file:
            transcription = groq_client.audio.transcriptions.create(
                file=(temp_audio_path, file.read()),
                model="whisper-large-v3",
                response_format="text"
            )

        # 3. Clean up the temp file
        os.remove(temp_audio_path)

        # 4. Feed the transcribed text directly into your LangGraph agents
        # Fully initialize the state to prevent KeyErrors in LangGraph
        initial_state = {
            "raw_pitch": transcription,
            "pacing_feedback": "",
            "narrative_feedback": "",
            "final_score": 0
        }

        # Invoke the LangGraph workflow
        result = lingua_graph.invoke(initial_state)

        return {
            "status": "success",
            "transcribed_text": transcription, # We send this back to show the user what they said!
            "pacing_feedback": result.get("pacing_feedback"),
            "narrative_feedback": result.get("narrative_feedback"),
            "final_score": result.get("final_score")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))