from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
import base64
import os
from dotenv import load_dotenv
from google.cloud import texttospeech, speech
from google.oauth2 import service_account
from application.authentication import verify_token
from application.database import users_collection, preferences_collection
from application.data_models import TTSRequest, STTRequest

load_dotenv()

router = APIRouter(prefix="/voice", tags=["Voice"])

# ===========================
# INITIALIZE GOOGLE CLOUD CLIENTS
# ===========================
GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_CLOUD_CREDENTIALS_PATH", 
                                     "/home/boa/AI-ReadSmart-FYP-/backend/google-cloud-voices-credentials.json")

credentials = service_account.Credentials.from_service_account_file(GOOGLE_CREDENTIALS_PATH)
tts_client = texttospeech.TextToSpeechClient(credentials=credentials)
stt_client = speech.SpeechClient(credentials=credentials)

# ===========================
# VOICE CONFIGURATIONS
# ===========================
VOICE_OPTIONS = {
    "voice_a": {"language_code": "en-US", "name": "en-US-Neural2-D", "gender": texttospeech.SsmlVoiceGender.MALE},
    "voice_b": {"language_code": "en-US", "name": "en-US-Neural2-F", "gender": texttospeech.SsmlVoiceGender.FEMALE},
    "voice_c": {"language_code": "en-US", "name": "en-US-Neural2-A", "gender": texttospeech.SsmlVoiceGender.MALE}
}

VOICE_DESCRIPTIONS = [
    {"id": "voice_a", "name": "George", "description": "Warm, friendly male voice (Google Neural2-D)"},
    {"id": "voice_b", "name": "Sarah", "description": "Soft, natural female voice (Google Neural2-F)"},
    {"id": "voice_c", "name": "Daniel", "description": "Clear, authoritative male voice (Google Neural2-A)"}
]

# ===========================
# HELPER FUNCTIONS
# ===========================
def get_authenticated_user(authorization: str):
    """Verify token and return user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split("Bearer ")[1]
    decoded = verify_token(token)
    
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = users_collection.find_one({"firebase_uid": decoded["uid"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

def get_user_voice_preference(user_id: str) -> dict:
    """Get user's voice preference from database."""
    prefs = preferences_collection.find_one({"user_id": user_id})
    voice_pref = prefs.get("tts_voice", "voice_a") if prefs else "voice_a"
    return VOICE_OPTIONS.get(voice_pref, VOICE_OPTIONS["voice_a"])

def synthesize_speech(text: str, voice_config: dict) -> bytes:
    """Generate speech audio from text using Google Cloud TTS."""
    synthesis_input = texttospeech.SynthesisInput(text=text)
    
    voice = texttospeech.VoiceSelectionParams(
        language_code=voice_config["language_code"],
        name=voice_config["name"],
        ssml_gender=voice_config["gender"]
    )
    
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=1.0,
        pitch=0.0,
        sample_rate_hertz=24000
    )
    
    response = tts_client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )
    
    return response.audio_content

# ===========================
# ENDPOINTS
# ===========================
@router.post("/tts")
async def text_to_speech(request: TTSRequest, authorization: str = Header(None)):
    """Convert text to speech using Google Cloud TTS. Returns base64 encoded audio."""
    try:
        user = get_authenticated_user(authorization)
        
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        voice_config = get_user_voice_preference(user["user_id"])
        audio_bytes = synthesize_speech(request.text, voice_config)
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return {
            "status": "success",
            "audio_data": audio_base64,
            "format": "mp3",
            "voice_id": request.voice_id or "voice_a",
            "voice_name": voice_config["name"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@router.post("/tts/stream")
async def text_to_speech_stream(request: TTSRequest, authorization: str = Header(None)):
    """Stream TTS audio for real-time playback."""
    try:
        user = get_authenticated_user(authorization)
        
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        voice_config = get_user_voice_preference(user["user_id"])
        audio_bytes = synthesize_speech(request.text, voice_config)
        
        def audio_stream_generator():
            chunk_size = 4096  # 4KB chunks
            for i in range(0, len(audio_bytes), chunk_size):
                yield audio_bytes[i:i + chunk_size]
        
        return StreamingResponse(
            audio_stream_generator(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"TTS Stream Error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS streaming failed: {str(e)}")


@router.post("/stt")
async def speech_to_text(request: STTRequest, authorization: str = Header(None)):
    """Convert speech to text using Google Cloud STT. Accepts base64 encoded audio."""
    try:
        user = get_authenticated_user(authorization)
        
        if not request.audio_data:
            raise HTTPException(status_code=400, detail="Audio data required")
        
        try:
            audio_bytes = base64.b64decode(request.audio_data)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 audio data")
        
        audio = speech.RecognitionAudio(content=audio_bytes)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.MP3,
            sample_rate_hertz=16000,
            language_code="en-US",
            enable_automatic_punctuation=True,
            model="default",
            use_enhanced=True
        )
        
        response = stt_client.recognize(config=config, audio=audio)
        
        if not response.results:
            return {"status": "success", "transcribed_text": "", "language": "en-US", "confidence": 0.0}
        
        alternative = response.results[0].alternatives[0]
        
        return {
            "status": "success",
            "transcribed_text": alternative.transcript,
            "language": "en-US",
            "confidence": getattr(alternative, 'confidence', 1.0)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"STT Error: {e}")
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")


@router.get("/voices")
async def get_available_voices(authorization: str = Header(None)):
    """Get list of available TTS voices."""
    try:
        user = get_authenticated_user(authorization)
        prefs = preferences_collection.find_one({"user_id": user["user_id"]})
        current_voice = prefs.get("tts_voice", "voice_a") if prefs else "voice_a"
        
        return {
            "status": "success",
            "current_voice": current_voice,
            "voices": VOICE_DESCRIPTIONS
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-tts")
async def test_tts():
    """Quick test endpoint for Google Cloud TTS (no auth needed)."""
    try:
        voice_config = VOICE_OPTIONS["voice_a"]
        audio_bytes = synthesize_speech("Hello! I am your AI news assistant. Welcome to ReadSmart.", voice_config)
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return {
            "status": "success",
            "message": "Google Cloud TTS is working!",
            "audio_data": audio_base64[:100] + "...",
            "audio_length_bytes": len(audio_bytes),
            "provider": "Google Cloud Text-to-Speech"
        }
    except Exception as e:
        return {"status": "error", "message": f"TTS test failed: {str(e)}"}