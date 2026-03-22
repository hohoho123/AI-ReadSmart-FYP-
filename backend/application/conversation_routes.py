from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from application.authentication import verify_token
from application.database import users_collection, conversations_collection
from application.data_models import ChatRequest, SaveConversationRequest, FollowupRequest
from application.ai_service import chat_with_ai, compare_for_smart_recap

router = APIRouter(prefix="/conversation", tags=["Conversation"])

# ===========================
# REUSABLE AUTH HELPER
# ===========================
def get_authenticated_user(authorization: str):
    """
    Verify token and return user.
    Raises HTTPException if auth fails.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Extract token from header
    token = authorization.split("Bearer ")[1]
    decoded = verify_token(token)
    
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Find user in database
    user = users_collection.find_one({"firebase_uid": decoded["uid"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


# ===========================
# AI CHAT ENDPOINT
# ===========================
@router.post("/chat")
async def ai_chat(
    request: ChatRequest,
    authorization: str = Header(None)
):
    
    """
    Send a message and get AI response.
    Uses Gemini API for real AI responses.
    """
    try:
        user = get_authenticated_user(authorization)
        
        # Convert conversation history to list of dicts
        history = []
        for msg in request.conversation_history:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Call Gemini AI
        ai_response = chat_with_ai(
            user_message=request.message,
            article_text=request.article_content or "",
            conversation_history=history
        )
        
        # Handle AI failure
        if not ai_response:
            print(f"[CHAT] Gemini returned None for article '{request.article_title}', article_content length: {len(request.article_content or '')}")
            ai_response = f"Sorry, I couldn't process your question about '{request.article_title}'. Please try again."
        
        return {
            "status": "success",
            "response": {
                "role": "assistant",
                "content": ai_response,
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# SAVE CONVERSATION ENDPOINT
# ===========================
@router.post("/save")
async def save_conversation(
    request: SaveConversationRequest,
    authorization: str = Header(None)
):
    """
    Bookmark/save the entire conversation.
    Called when user clicks the bookmark icon in the mini AI popup.
    """
    try:
        user = get_authenticated_user(authorization)
        
        conversation_id = str(uuid.uuid4())
        created_at = datetime.now()
        expires_at = created_at + timedelta(days=30)
        
        # Convert messages to dict format for MongoDB
        messages_data = []
        for msg in request.messages:
            messages_data.append({
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp or datetime.now().isoformat()
            })
        
        conversation = {
            "conversation_id": conversation_id,
            "user_id": user["user_id"],
            "article_id": request.article_id,
            "article_title": request.article_title,
            "article_url": request.article_url,
            "messages": messages_data,
            "created_at": created_at,
            "updated_at": created_at,
            "expires_at": expires_at
        }
        
        conversations_collection.insert_one(conversation)
        
        return {
            "status": "success",
            "message": "Conversation bookmarked",
            "conversation_id": conversation_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Get All Saved Conversations
# ===========================
@router.get("/saved")
async def get_saved_conversations(authorization: str = Header(None)):
    """
    Get all bookmarked conversations (like ChatGPT sidebar).
    Returns list sorted by most recent first.
    """
    try:
        user = get_authenticated_user(authorization)
        
        # Get non-expired conversations, newest first
        now = datetime.now()
        conversations = list(
            conversations_collection.find({
                "user_id": user["user_id"],
                "expires_at": {"$gt": now}
            }).sort("updated_at", -1)
        )
        
        # Format for response (summary view, not full messages)
        saved_list = []
        for conv in conversations:
            # Get preview from first user message
            first_user_msg = ""
            for msg in conv.get("messages", []):
                if msg["role"] == "user":
                    first_user_msg = msg["content"][:100]
                    break
            
            saved_list.append({
                "conversation_id": conv["conversation_id"],
                "article_title": conv["article_title"],
                "preview": first_user_msg,
                "message_count": len(conv.get("messages", [])),
                "created_at": conv["created_at"].isoformat(),
                "updated_at": conv.get("updated_at", conv["created_at"]).isoformat()
            })
        
        return {
            "status": "success",
            "count": len(saved_list),
            "conversations": saved_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Get Single Conversation (Full)
# ===========================
@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    authorization: str = Header(None)
):
    """
    Get a specific conversation with all messages.
    Called when user clicks on a conversation in the Conversation Tab.
    """
    try:
        user = get_authenticated_user(authorization)
        
        conversation = conversations_collection.find_one({
            "conversation_id": conversation_id
        })
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if conversation["expires_at"] < datetime.now():
            raise HTTPException(status_code=410, detail="Conversation expired")
        
        return {
            "status": "success",
            "conversation": {
                "conversation_id": conversation["conversation_id"],
                "article_id": conversation["article_id"],
                "article_title": conversation["article_title"],
                "article_url": conversation["article_url"],
                "messages": conversation["messages"],
                "created_at": conversation["created_at"].isoformat(),
                "updated_at": conversation.get("updated_at", conversation["created_at"]).isoformat(),
                "expires_at": conversation["expires_at"].isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Delete Conversation
# ===========================
@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    authorization: str = Header(None)
):
    """Delete a bookmarked conversation."""
    try:
        user = get_authenticated_user(authorization)
        
        conversation = conversations_collection.find_one({
            "conversation_id": conversation_id
        })
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        conversations_collection.delete_one({"conversation_id": conversation_id})
        
        return {
            "status": "success",
            "message": "Conversation deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Followup / Smart Recap
# ===========================
@router.post("/{conversation_id}/followup")
async def conversation_followup(
    conversation_id: str,
    request: FollowupRequest,
    authorization: str = Header(None)
):
    """
    Smart Recap - Continue old conversation with followup question.
    Uses Gemini AI for real responses.
    """
    try:
        user = get_authenticated_user(authorization)
        
        conversation = conversations_collection.find_one({
            "conversation_id": conversation_id
        })
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if conversation["expires_at"] < datetime.now():
            raise HTTPException(status_code=410, detail="Conversation expired")
        
        # Route based on whether frontend sent new article text (Smart Recap)
        if request.new_article_text:
            # Smart Recap - compare with current news
            old_messages = conversation.get("messages", [])
            ai_response = compare_for_smart_recap(
                old_conversation=old_messages,
                new_article_text=request.new_article_text,
                original_article_text=request.original_article_text,
            )
            
            if not ai_response:
                ai_response = f"No significant updates found for '{conversation['article_title']}' since your last conversation."
        else:
            # Regular followup — use DB history + original article text if provided
            ai_response = chat_with_ai(
                user_message=request.message,
                article_text=request.original_article_text if request.original_article_text else None,
                conversation_history=conversation.get("messages", [])
            )
            
            if not ai_response:
                print(f"[FOLLOWUP] Gemini returned None for '{conversation['article_title']}', history length: {len(conversation.get('messages', []))}")
                ai_response = f"Sorry, I couldn't process your followup about '{conversation['article_title']}'. Please try again."
        
        # Append latest article URL to AI response if provided (so it's persisted too)
        if request.latest_article_url:
            ai_response = f"{ai_response}\n\nLatest Article: {request.latest_article_url}"

        # Add new messages to conversation
        now = datetime.now()
        new_user_msg = {
            "role": "user",
            "content": request.message,
            "timestamp": now.isoformat()
        }
        new_ai_msg = {
            "role": "assistant",
            "content": ai_response,
            "timestamp": now.isoformat()
        }
        
        conversations_collection.update_one(
            {"conversation_id": conversation_id},
            {
                "$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}},
                "$set": {"updated_at": now}
            }
        )
        
        return {
            "status": "success",
            "response": {
                "role": "assistant",
                "content": ai_response,
                "timestamp": now.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))