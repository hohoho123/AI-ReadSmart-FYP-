from fastapi import APIRouter, HTTPException, Header
from typing import List
from datetime import datetime
from application.authentication import verify_token
from application.database import users_collection, preferences_collection
from application.data_models import PreferencesUpdate, ProfileSetup

router = APIRouter(prefix="/preferences", tags=["User Preferences"])

# NEW ENDPOINT - For D4 First-Time Profile Creation
@router.post("/setup")
async def setup_profile(
    profile_data: ProfileSetup,
    authorization: str = Header(None)
):
    """
    First-time profile setup 
    Sets initial preferences and marks profile as complete
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = authorization.split("Bearer ")[1]
        decoded = verify_token(token)
        
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if profile already completed
        if user.get("profile_completed", False):
            raise HTTPException(status_code=400, detail="Profile already setup")
        
        # Create initial preferences from D4 choices
        initial_prefs = {
            "user_id": user["user_id"],
            "followed_topics": profile_data.followed_topics,
            "tts_voice": profile_data.tts_voice,
            "playback_speed": profile_data.playback_speed,
            "updated_at": datetime.now()
        }
        
        # Save preferences
        preferences_collection.update_one(
            {"user_id": user["user_id"]},
            {"$set": initial_prefs},
            upsert=True
        )
        
        # Mark profile as completed
        users_collection.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"profile_completed": True}}
        )
        
        return {
            "status": "success",
            "message": "Profile setup completed",
            "preferences": {
                "followed_topics": profile_data.followed_topics,
                "tts_voice": profile_data.tts_voice,
                "playback_speed": profile_data.playback_speed
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# EXISTING ENDPOINT - Get current preferences
@router.get("/")
async def get_preferences(authorization: str = Header(None)):
    """
    Get user's current preferences
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = authorization.split("Bearer ")[1]
        decoded = verify_token(token)
        
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        prefs = preferences_collection.find_one({"user_id": user["user_id"]})
        
        if not prefs:
            # Should not happen if profile setup is done correctly
            return {
                "status": "success",
                "preferences": {
                    "followed_topics": [],
                    "tts_voice": "voice_a",
                    "playback_speed": "1.0x"
                }
            }
        
        return {
            "status": "success",
            "preferences": {
                "followed_topics": prefs.get("followed_topics", []),
                "tts_voice": prefs.get("tts_voice", "voice_a"),
                "playback_speed": prefs.get("playback_speed", "1.0x")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# D7 ENDPOINT - Follow a topic (add to existing preferences)
@router.post("/follow-topic")
async def follow_topic(
    topic: str,
    authorization: str = Header(None)
):
    """
    Add a topic to followed topics (D7 Explore Feeds screen)
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = authorization.split("Bearer ")[1]
        decoded = verify_token(token)
        
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get current preferences
        prefs = preferences_collection.find_one({"user_id": user["user_id"]})
        
        if not prefs:
            raise HTTPException(status_code=400, detail="Profile not setup yet")
        
        # Check if already following
        current_topics = prefs.get("followed_topics", [])
        if topic in current_topics:
            return {
                "status": "success",
                "message": f"Already following {topic}",
                "followed_topics": current_topics
            }
        
        # Add topic
        current_topics.append(topic)
        preferences_collection.update_one(
            {"user_id": user["user_id"]},
            {
                "$set": {
                    "followed_topics": current_topics,
                    "updated_at": datetime.now()
                }
            }
        )
        
        return {
            "status": "success",
            "message": f"Now following {topic}",
            "followed_topics": current_topics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# D7 ENDPOINT - Unfollow a topic
@router.post("/unfollow-topic")
async def unfollow_topic(
    topic: str,
    authorization: str = Header(None)
):
    """
    Remove a topic from followed topics (D7 Explore Feeds screen)
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = authorization.split("Bearer ")[1]
        decoded = verify_token(token)
        
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        prefs = preferences_collection.find_one({"user_id": user["user_id"]})
        
        if not prefs:
            raise HTTPException(status_code=400, detail="Profile not setup yet")
        
        current_topics = prefs.get("followed_topics", [])
        
        if topic not in current_topics:
            return {
                "status": "success",
                "message": f"Not following {topic}",
                "followed_topics": current_topics
            }
        
        # Remove topic
        current_topics.remove(topic)
        preferences_collection.update_one(
            {"user_id": user["user_id"]},
            {
                "$set": {
                    "followed_topics": current_topics,
                    "updated_at": datetime.now()
                }
            }
        )
        
        return {
            "status": "success",
            "message": f"Unfollowed {topic}",
            "followed_topics": current_topics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# D9 ENDPOINT - Update TTS/display settings (Profile Settings)
@router.put("/update")
async def update_preferences(
    updates: PreferencesUpdate,
    authorization: str = Header(None)
):
    """
    Update preferences like TTS voice, playback speed (D9 Profile Settings)
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = authorization.split("Bearer ")[1]
        decoded = verify_token(token)
        
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build update dictionary
        update_data = {"updated_at": datetime.now()}
        
        if updates.followed_topics is not None:
            update_data["followed_topics"] = updates.followed_topics
        
        if updates.tts_voice is not None:
            update_data["tts_voice"] = updates.tts_voice
        
        if updates.playback_speed is not None:
            update_data["playback_speed"] = updates.playback_speed
        
        if updates.text_size is not None:
            update_data["text_size"] = updates.text_size

        if updates.tts_enabled is not None:
            update_data["tts_enabled"] = updates.tts_enabled

        if updates.stt_enabled is not None:
            update_data["stt_enabled"] = updates.stt_enabled
        
        # Update preferences
        preferences_collection.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
        
        # Get updated preferences
        prefs = preferences_collection.find_one({"user_id": user["user_id"]})
        
        return {
            "status": "success",
            "message": "Preferences updated",
            "preferences": {
                "followed_topics": prefs.get("followed_topics", []),
                "tts_voice": prefs.get("tts_voice", "voice_a"),
                "playback_speed": prefs.get("playback_speed", "1.0x"),
                "text_size": prefs.get("text_size", "medium")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))