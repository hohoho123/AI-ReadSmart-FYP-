from fastapi import APIRouter, HTTPException, Header
from datetime import datetime, timedelta
import uuid
from application.data_models import UserCreate, UserLogin, UserResponse, SuccessResponse
from application.database import (
    users_collection,
    get_user_by_email,
    create_user,
    preferences_collection
)
from application.authentication import create_firebase_user, get_user_by_email as get_firebase_user, verify_token

# Create router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Signup endpoint
@router.post("/signup")
async def signup(user_data: UserCreate):
    try:
        # 1. Check if user already exists
        existing_user = get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # 2. Create user in Firebase (Firebase requires 'display_name')
        firebase_user = create_firebase_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name 
        )
        
        if not firebase_user:
            raise HTTPException(status_code=500, detail="Failed to create user in Firebase")
        
        # 3. Create user in MongoDB
        user_id = str(uuid.uuid4())
        new_user = {
            "user_id": user_id,
            "email": user_data.email,
            "display_name": user_data.display_name,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "firebase_uid": firebase_user.uid,
            "created_at": datetime.now(),
            "profile_completed": True 
        }
        create_user(new_user)
        
        # 4. Immediately create their preferences in MongoDB
        new_prefs = {
            "user_id": user_id,
            "followed_topics": user_data.followed_topics,
            "tts_voice": "voice_a",
            "playback_speed": "1.0x",
            "tts_enabled": True,
            "stt_enabled": True,
            "updated_at": datetime.now()
        }
        preferences_collection.insert_one(new_prefs)
        
        return {
            "status": "success",
            "message": "Account and profile created successfully",
            "user": {
                "user_id": user_id,
                "email": user_data.email,
                "display_name": user_data.display_name,
                "profile_completed": True
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")

# Login endpoint
@router.post("/login")
async def login(credentials: UserLogin):
    """
    Login with email and password
    Note: Actual authentication happens on frontend using Firebase SDK
    This endpoint just verifies user exists in our database
    """
    try:
        # Check if user exists in Firebase
        firebase_user = get_firebase_user(credentials.email)
        if not firebase_user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Get user from our database
        user = get_user_by_email(credentials.email)
        if not user:
            raise HTTPException(status_code=401, detail="User not found in database")
        
        return {
            "status": "success",
            "message": "Login successful",
            "user": {
                "user_id": user["user_id"],
                "email": user["email"],
                "display_name": user["display_name"],
                "profile_completed": user.get("profile_completed", False)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

# Verify token endpoint
@router.get("/verify")
async def verify_user_token(authorization: str = Header(None)):
    """
    Verify if user's Firebase token is valid
    Frontend sends token in Authorization header
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="No authorization token provided")
        
        # Token format: "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid token format")
        
        token = authorization.split("Bearer ")[1]
        
        # Verify token with Firebase
        decoded = verify_token(token)
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        # Get user from database
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "status": "success",
            "message": "Token is valid",
            "user": {
                "user_id": user["user_id"],
                "email": user["email"],
                "display_name": user["display_name"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

# Get current user endpoint
@router.get("/me")
async def get_current_user(authorization: str = Header(None)):
    """
    Get current logged-in user's information
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid token format")
        
        token = authorization.split("Bearer ")[1]
        decoded = verify_token(token)
        
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user preferences
        prefs = preferences_collection.find_one({"user_id": user["user_id"]})
        
        return {
            "status": "success",
            "user": {
                "user_id": user["user_id"],
                "email": user["email"],
                "display_name": user["display_name"],
                "created_at": user["created_at"].isoformat(),
                "preferences": {
                    "followed_topics": prefs.get("followed_topics", []) if prefs else [],
                    "tts_voice": prefs.get("tts_voice", "voice_a") if prefs else "voice_a",
                    "playback_speed": prefs.get("playback_speed", "1.0x") if prefs else "1.0x"
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))