from pymongo import MongoClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Get MongoDB URL from .env
MONGODB_URL = os.getenv("MONGODB_URL")

# Create MongoDB client
client = MongoClient(MONGODB_URL, server_api=ServerApi('1'))

# Test the connection
try:
    client.admin.command('ping')
    print("Successfully connected to MongoDB!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# Get database
db = client["ai_readsmart_db"]

# Collections (tables)
users_collection = db["users"]
conversations_collection = db["conversations"]
articles_collection = db["articles"]
preferences_collection = db["preferences"]
saved_articles_collection = db["saved_articles"]

# ===========================
# CREATE INDEXES (for faster queries)
# ===========================

def create_indexes():
    """Create indexes to make database queries faster"""
    try:
        # Users - email and user_id must be unique
        users_collection.create_index("email", unique=True)
        users_collection.create_index("user_id", unique=True)
        
        # Conversations - index by user and date
        conversations_collection.create_index("user_id")
        conversations_collection.create_index("conversation_id", unique=True)
        # TTL index: MongoDB automatically deletes documents when expires_at is reached
        conversations_collection.create_index("expires_at", expireAfterSeconds=0)
        
        # Preferences - one per user
        preferences_collection.create_index("user_id", unique=True)
        
        # Saved articles - prevent duplicate saves
        saved_articles_collection.create_index(
            [("user_id", 1), ("article_id", 1)], 
            unique=True
        )
        
        print("Database indexes created!")
    except Exception as e:
        print(f"Error creating indexes: {e}")

# Run on startup
create_indexes()

# ===========================
# HELPER FUNCTIONS
# ===========================

def cleanup_old_conversations():
    """Delete conversations older than 30 days (Smart Recap requirement)"""
    try:
        now = datetime.now()
        result = conversations_collection.delete_many({
            "expires_at": {"$lt": now}
        })
        
        if result.deleted_count > 0:
            print(f"Deleted {result.deleted_count} expired conversations")
        
        return result.deleted_count
    except Exception as e:
        print(f"Error cleaning up conversations: {e}")
        return 0

def get_user_by_email(email: str):
    """Find user by email"""
    return users_collection.find_one({"email": email})

def get_user_by_id(user_id: str):
    """Find user by user_id"""
    return users_collection.find_one({"user_id": user_id})

def create_user(user_data: dict):
    """Create new user in database"""
    result = users_collection.insert_one(user_data)
    return result.inserted_id

def get_user_preferences(user_id: str):
    """Get user's preferences"""
    prefs = preferences_collection.find_one({"user_id": user_id})
    if not prefs:
        # Create default preferences if none exist
        default_prefs = {
            "user_id": user_id,
            "followed_topics": [],
            "tts_voice": "voice_a",
            "playback_speed": "1.0x",
            "updated_at": datetime.now()
        }
        preferences_collection.update_one(
            {"user_id": user_id},
            {"$setOnInsert": default_prefs},
            upsert=True
        )
        return default_prefs
    return prefs

def update_user_preferences(user_id: str, updates: dict):
    """Update user preferences"""
    updates["updated_at"] = datetime.now()
    result = preferences_collection.update_one(
        {"user_id": user_id},
        {"$set": updates},
        upsert=True  # Create if doesn't exist
    )
    return result.modified_count
