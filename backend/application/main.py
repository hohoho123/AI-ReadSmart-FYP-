from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from application.database import db, client, cleanup_old_conversations, users_collection, conversations_collection
from application.data_models import UserResponse, SuccessResponse
from application.authentication import verify_token, get_user_by_email
from application.auth_routes import router as auth_router
from application.news_routes import router as news_router
from application.preferences_routes import router as preferences_router
from application.conversation_routes import router as conversation_router
from application.ai_service import load_ai_model, summarize_article
from application.voice_audio_routes import router as voice_router

#Create FastAPI app instance
app = FastAPI(
    title="AI-ReadSmart API",
    description="Backend for AI-ReadSmart mobile application",
    version="1.0.0"
)

#Enable CORS (so your frontend can talk to backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(news_router)
app.include_router(preferences_router)
app.include_router(conversation_router)
app.include_router(voice_router)

# Startup event - test database connection and load AI model
@app.on_event("startup")
async def startup_event():
    try:

        # Test database connection
        client.admin.command('ping')
        print("Database connection successful!")

        # Clean up old conversations (30 days+)
        cleanup_old_conversations()

        # Load AI model on startup
        print("Loading AI model...")
        load_ai_model()

        print("Server is ready!")

    except Exception as e:
        print(f"Startup Error: {e}")

# Shutdown event - close database connection
@app.on_event("shutdown")
async def shutdown_event():
    client.close()
    print("Database connection closed")

#BASIC ENDPOINTS
#Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to AI-ReadSmart API!",
        "status": "Server is running",
        "database": "Connected to MongoDB",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "auth": "/auth/*",
            "news": "/news/*",
            "preferences": "/preferences/*",
            "conversation": "/conversation/*"
        }
    }

#Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

#Database test endpoint
@app.get("/stats")
async def get_stats():
    """Get database statistics"""
    try:
        user_count = users_collection.count_documents({})
        conversation_count = conversations_collection.count_documents({})
        
        return {
            "status": "success",
            "total_users": user_count,
            "total_conversations": conversation_count,
            "database_name": db.name,
            "collections": db.list_collection_names()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===========================
# TEST ENDPOINTS (for development)
# ===========================

@app.get("/test-models")
async def test_models():
    """Test that Pydantic models work"""
    try:
        # Create a sample user
        sample_user = UserResponse(
            user_id="bob_123",
            email="bob@example.com",
            display_name="Bob Junior",
            created_at=datetime.now()
        )
        
        return {
            "status": "success",
            "message": "Models are working perfectly!",
            "sample_data": sample_user.dict()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/test-db")
async def test_database_write():
    """Test writing to database"""
    try:
        # Insert test document
        test_doc = {
            "test": True,
            "message": "Testing database write",
            "timestamp": datetime.now()
        }
        
        result = db["test_collection"].insert_one(test_doc)
        
        # Clean up test data
        db["test_collection"].delete_one({"_id": result.inserted_id})
        
        return {
            "status": "success",
            "message": "Database write test passed!",
            "inserted_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
# Test Firebase
@app.get("/test-firebase")
async def test_firebase():
    """Quick test to see if Firebase is working"""
    try:
        # Try to get a user that doesn't exist
        # If Firebase is working, this will return None (not crash)
        result = get_user_by_email("test@test.com")
        
        return {
            "status": "Firebase is connected!",
            "test_result": "No errors - everything works"
        }
    except Exception as e:
        return {
            "status": "Firebase error",
            "error": str(e)
        }

# ===========================
# CLEANUP ENDPOINT
# ===========================

@app.post("/cleanup-conversations")
async def manual_cleanup():
    """Manually trigger conversation cleanup (delete 30+ day old ones)"""
    try:
        deleted_count = cleanup_old_conversations()
        return {
            "status": "success",
            "message": f"Cleaned up {deleted_count} old conversations"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ===========================
# AI TEST ENDPOINT (for development)
# ===========================

@app.post("/test-ai")
async def test_ai_summarization(text: str):
    """
    Test endpoint for AI summarization.
    Use this to verify Gemini is working.
    """
    try:
        if not text or len(text.strip()) < 20:
            raise HTTPException(status_code=400, detail="Text too short. Provide at least 20 characters.")
        
        summary = summarize_article(text)
        
        if not summary:
            raise HTTPException(status_code=500, detail="Summarization failed")
        
        return {
            "status": "success",
            "original_words": len(text.split()),
            "summary_words": len(summary.split()),
            "summary": summary
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/list-models")
async def list_gemini_models():
    """
    List available Gemini models
    """
    try:
        import google.generativeai as genai
        
        models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                models.append({
                    "name": m.name,
                    "display_name": m.display_name,
                    "description": m.description
                })
        
        return {
            "status": "success",
            "available_models": models
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))