from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# ===========================
# USER MODELS
# ===========================

class UserCreate(BaseModel):
    """For user signup"""
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=2, max_length=50)
    full_name: Optional[str] = None
    phone: Optional[str] = None
    followed_topics: List[str] = []
    tts_voice: Optional[str] = "voice_a"

class UserLogin(BaseModel):
    """For user login"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """User data sent to frontend (no password!)"""
    user_id: str
    email: str
    display_name: str
    created_at: datetime

class UserInDB(BaseModel):
    """User data stored in database"""
    user_id: str
    email: str
    display_name: str
    password_hash: str
    created_at: datetime
    firebase_uid: Optional[str] = None
    profile_completed: bool = False 

class ProfileSetup(BaseModel):
    """First-time profile setup"""
    followed_topics: List[str] = Field(min_items=1, max_items=10)
    tts_voice: str = "voice_a"

# ===========================
# USER PREFERENCES
# ===========================

class UserPreferences(BaseModel):
    """User's app preferences"""
    user_id: str
    followed_topics: List[str] = []
    tts_voice: str = "voice_a"
    tts_enabled: bool = True  
    stt_enabled: bool = True   
    updated_at: datetime = Field(default_factory=datetime.now)

class PreferencesUpdate(BaseModel):
    """For updating preferences"""
    followed_topics: Optional[List[str]] = None
    tts_voice: Optional[str] = None
    text_size: Optional[str] = None
    tts_enabled: Optional[bool] = None   
    stt_enabled: Optional[bool] = None   

class ProfileUpdate(BaseModel):
    """For updating user profile"""
    display_name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None

# ===========================
# ARTICLE MODELS
# ===========================

class Article(BaseModel):
    """News article"""
    article_id: str
    title: str
    source: str
    author: Optional[str] = None
    description: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    published_at: datetime
    content: Optional[str] = None
    category: Optional[str] = None

class SavedArticle(BaseModel):
    """User's bookmarked article"""
    user_id: str
    article_id: str
    saved_at: datetime = Field(default_factory=datetime.now)

# ===========================
# CONVERSATION SYSTEM (SMART RECAP CORE)
# ===========================

class ChatMessage(BaseModel):
    """Single message in a conversation (like ChatGPT)"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    """Request to send a chat message to AI"""
    article_id: str
    article_title: str
    article_content: Optional[str] = None
    message: str
    conversation_history: List[ChatMessage] = []

class SaveConversationRequest(BaseModel):
    """Request to bookmark/save a conversation"""
    article_id: str
    article_title: str
    article_url: str
    messages: List[ChatMessage]

class FollowupRequest(BaseModel):
    """Request for Smart Recap followup"""
    message: str  # User's followup question
    new_article_text: Optional[str] = None  # Optional: latest article to compare
    original_article_text: Optional[str] = None  # Optional: original article for richer text-vs-text comparison
    latest_article_url: Optional[str] = None  # Optional: URL of latest article, appended to saved AI response

# ===========================
# VOICE & AUDIO MODELS
# ===========================

class TTSRequest(BaseModel):
    """Text-to-Speech request for Google Cloud TTS"""
    text: str
    voice_id: Optional[str] = "voice_a"  

class STTRequest(BaseModel):
    """Speech-to-Text request for Google Cloud STT (used by /voice/stt endpoint)"""
    audio_data: str  # Base64 encoded audio

class VoiceCommandRequest(BaseModel):
    """
    Legacy/alternative voice input model with additional context.
    Use this if you need to pass user_id and article_id in request body.
    For authenticated endpoints, prefer STTRequest + auth header.
    """
    audio_data: str  # Base64 encoded
    user_id: str
    article_id: Optional[str] = None

class VoiceCommandResponse(BaseModel):
    """Transcribed text from voice"""
    transcribed_text: str

# ===========================
# GENERAL RESPONSES
# ===========================

class SuccessResponse(BaseModel):
    """Success message"""
    status: str = "success"
    message: str
    data: Optional[dict] = None

class ErrorResponse(BaseModel):
    """Error message"""
    status: str = "error"
    message: str