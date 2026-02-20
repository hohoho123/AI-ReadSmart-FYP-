from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional, List
from datetime import datetime
from application.news_service import fetch_top_headlines, search_news, format_article, get_news_by_topics
from application.authentication import verify_token
from application.database import users_collection, preferences_collection, saved_articles_collection

router = APIRouter(prefix="/news", tags=["News"])

@router.get("/headlines")
async def get_headlines(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    Get top headlines
    Categories: business, entertainment, general, health, science, sports, technology
    """
    try:
        articles = fetch_top_headlines(
            category=category,
            page=page,
            page_size=page_size
        )
        
        if articles is None:
            raise HTTPException(status_code=500, detail="Failed to fetch news")
        
        # Format articles
        formatted_articles = []
        for article in articles:
            formatted = format_article(article)
            if formatted:
                if category:
                    formatted["category"] = category
                formatted_articles.append(formatted)
        
        return {
            "status": "success",
            "count": len(formatted_articles),
            "articles": formatted_articles
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_news_endpoint(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    Search for news articles by keyword
    """
    try:
        articles = search_news(
            query=q,
            page=page,
            page_size=page_size
        )
        
        if articles is None:
            raise HTTPException(status_code=500, detail="Failed to search news")
        
        # Format articles
        formatted_articles = []
        for article in articles:
            formatted = format_article(article)
            if formatted:
                formatted_articles.append(formatted)
        
        return {
            "status": "success",
            "query": q,
            "count": len(formatted_articles),
            "articles": formatted_articles
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feed")
async def get_personalized_feed(
    authorization: str = Header(None),
    page: int = Query(1, ge=1)
):
    """
    Get personalized news feed based on user's followed topics
    Requires authentication
    """
    try:
        # Verify user token
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = authorization.split("Bearer ")[1]
        decoded = verify_token(token)
        
        if not decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user
        user = users_collection.find_one({"firebase_uid": decoded["uid"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user preferences
        prefs = preferences_collection.find_one({"user_id": user["user_id"]})
        
        if not prefs or not prefs.get("followed_topics"):
            # No topics followed, return general news
            articles = fetch_top_headlines(page=page, page_size=20)
            if articles is None:
                raise HTTPException(status_code=500, detail="Failed to fetch news")
            
            formatted_articles = [format_article(a) for a in articles if format_article(a)]
            
            return {
                "status": "success",
                "message": "No topics followed, showing general news",
                "count": len(formatted_articles),
                "articles": formatted_articles
            }
        
        # Get news for followed topics
        topics = prefs["followed_topics"]
        articles = get_news_by_topics(topics, page=page)
        
        return {
            "status": "success",
            "followed_topics": topics,
            "count": len(articles),
            "articles": articles
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_article(
    article_id: str,
    authorization: str = Header(None)
):
    """
    Save/bookmark an article
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
        
        # Check if already saved
        existing = saved_articles_collection.find_one({
            "user_id": user["user_id"],
            "article_id": article_id
        })
        
        if existing:
            return {
                "status": "success",
                "message": "Article already saved"
            }
        
        # Save article
        saved_articles_collection.insert_one({
            "user_id": user["user_id"],
            "article_id": article_id,
            "saved_at": datetime.now()
        })
        
        return {
            "status": "success",
            "message": "Article saved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/saved")
async def get_saved_articles(
    authorization: str = Header(None)
):
    """
    Get user's saved articles
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
        
        # Get saved articles
        saved = list(saved_articles_collection.find(
            {"user_id": user["user_id"]}
        ).sort("saved_at", -1))
        
        return {
            "status": "success",
            "count": len(saved),
            "articles": saved
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/saved/{article_id}")
async def unsave_article(
    article_id: str,
    authorization: str = Header(None)
):
    """
    Remove a saved/bookmarked article
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
        
        result = saved_articles_collection.delete_one({
            "user_id": user["user_id"],
            "article_id": article_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Saved article not found")
        
        return {
            "status": "success",
            "message": "Article unsaved"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))