import random
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from typing import Optional, List
from datetime import datetime
from application.news_service import search_news, search_news_for_topic, format_article, get_news_by_topics
from application.authentication import get_current_user
from application.database import users_collection, preferences_collection, saved_articles_collection
import requests as http_requests
import trafilatura

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

# ===========================
# HORIZONTAL FEED ENDPOINT
# ===========================
@router.get("/feed")
def get_personalized_feed(page: int = Query(1, ge=1), user_token: dict = Depends(get_current_user)):
    try:
        # 1. Two-step database lookup to ensure right topics
        user_id = user_token.get("uid") 
        user = users_collection.find_one({"firebase_uid": user_id})
        
        if user:
            prefs = preferences_collection.find_one({"user_id": user["user_id"]}) 
            topics = prefs.get("followed_topics", ["Technology", "General"]) if prefs else ["Technology", "General"]
        else:
            print(f"DATABASE WARNING: User with Firebase UID {user_id} not found.")
            topics = ["Technology", "General"] 
            
        final_articles = []
        
        for topic in topics:
            # 2. Fetch 5 raw articles for this specific topic using search_news
            topic_articles = search_news(query=topic, page=page, page_size=5)
            
            if topic_articles and len(topic_articles) > 0:
                # 3. Pick exactly ONE random article per topic
                chosen_article = random.choice(topic_articles)
                
                # 4. Format the keys to EXACTLY match what HomeScreen.
                formatted = {
                    "title": chosen_article.get("title", "Untitled"),
                    "category": topic,
                    # Frontend expects article.source.name
                    "source": {"name": chosen_article.get("source", {}).get("name", "News Update")}, 
                    # Frontend expects article.publishedAt
                    "publishedAt": chosen_article.get("publishedAt", datetime.now().isoformat()),
                    # Frontend expects article.urlToImage
                    "urlToImage": chosen_article.get("urlToImage"),
                    "url": chosen_article.get("url", ""),
                    # ArticleDetailScreen needs these for the article body
                    "description": chosen_article.get("description", ""),
                    "content": chosen_article.get("content", ""),
                }
                final_articles.append(formatted)
                
        return {"status": "success", "articles": final_articles, "user_topics": topics}
        
    except Exception as e:
        print(f"Feed Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===========================
# VERTICAL RECOMMENDATIONS ENDPOINT
# ===========================
@router.get("/recommendations")
def get_recommendations(topic: Optional[str] = "All", page: int = 1, user_token: dict = Depends(get_current_user)):
    try:
        # 1. Look up user's followed topics (same pattern as /feed)
        user_id = user_token.get("uid")
        user = users_collection.find_one({"firebase_uid": user_id})
        if user:
            prefs = preferences_collection.find_one({"user_id": user["user_id"]})
            followed_topics = prefs.get("followed_topics", ["Technology", "General"]) if prefs else ["Technology", "General"]
        else:
            followed_topics = ["Technology", "General"]

        if topic == "All":
            # 2a. "All" tab — fetch 2 articles per followed topic then shuffle for variety
            all_articles = []
            for t in followed_topics:
                articles = search_news_for_topic(topic=t, page=page, page_size=2)
                if articles:
                    for a in articles:
                        a["category"] = t
                    all_articles.extend(articles)
            random.shuffle(all_articles)
            return {"status": "success", "articles": all_articles}
        else:
            # 2b. Specific topic tab — use accurate topic-aware search
            articles = search_news_for_topic(topic=topic, page=page, page_size=5)
            for a in articles:
                a["category"] = topic
            return {"status": "success", "articles": articles}

    except Exception as e:
        print(f"Recommendation Error: {e}")
        return {"status": "error", "articles": []}

# ===========================
# ARTICLE SCRAPING ENDPOINT
# ===========================
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


@router.get("/scrape")
async def scrape_article(url: str = Query(..., min_length=10)):
    """
    Fetches the article URL and extracts clean body text using trafilatura.
    If extraction fails or yields insufficient text, returns a partial status
    so the frontend can render an informational limitation box.
    """
    try:
        resp = http_requests.get(url, headers=REQUEST_HEADERS, timeout=12)
        resp.raise_for_status()
        raw_html = resp.text
    except Exception as fetch_err:
        print(f"Fetch failed ({url}): {fetch_err}")
        return {
            "status": "partial",
            "full_text": "",
            "message": "Could not reach the article. The publisher may be blocking external requests.",
        }

    full_text = ""
    try:
        result = trafilatura.extract(
            raw_html,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
            favor_recall=True,
        )
        full_text = (result or "").strip()
    except Exception as e:
        print(f"Trafilatura extraction failed: {e}")

    if not full_text or len(full_text) < 50:
        return {
            "status": "partial",
            "full_text": "",
            "message": (
                "Full article text could not be extracted. "
                "This publisher may use JavaScript rendering, a paywall, or "
                "block automated access. Use \"Read full article\" to view it in your browser."
            ),
        }

    return {
        "status": "success",
        "full_text": full_text,
        "paragraph_count": full_text.count("\n") + 1,
    }

# ===========================
# SAVING ARTICLES ENDPOINTS
# ===========================
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

# ===========================
# LOAD SAVED ARTICLES ENDPOINT
# ===========================
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

# ===========================
# REMOVE SAVED ARTICLE ENDPOINT
# ===========================
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