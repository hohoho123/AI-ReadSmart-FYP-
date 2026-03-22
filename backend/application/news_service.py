import requests
import os
import httpx
import random
import os
from typing import List, Optional
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

# =========================================================
# NEWS FETCHING SERVICE
# =========================================================

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
NEWS_API_BASE_URL = "https://newsapi.org/v2"

# Fetch articles one by one to prevent duplicates across pages
async def get_news_by_topics(topics: list, page: int = 1) -> list:
    articles = []
    async with httpx.AsyncClient() as client:
        for topic in topics:
            url = f"{NEWS_API_BASE_URL}/top-headlines?category={topic.lower()}&language=en&page={page}&pageSize=1&apiKey={NEWS_API_KEY}"
            try:
                response = await client.get(url)
                data = response.json()
                if data.get("status") == "ok" and data.get("articles"):
                    articles.extend(data["articles"])
            except Exception as e:
                print(f"Error fetching {topic}: {e}")
    return articles

# Fetch paginated news for infinite scroll implementation
async def get_paginated_news(topic: Optional[str] = None, page: int = 1, page_size: int = 5):
    async with httpx.AsyncClient() as client:
        url = f"{NEWS_API_BASE_URL}/top-headlines?language=en&page={page}&pageSize={page_size}&apiKey={NEWS_API_KEY}"
        if topic and topic.lower() != 'all':
            url += f"&category={topic.lower()}"
            
        try:
            response = await client.get(url)
            data = response.json()
            if data.get("status") == "ok" and data.get("articles"):
                return data["articles"]
            return []
        except Exception as e:
            print(f"Error fetching paginated news: {e}")
            return []

# Topics that map directly to NewsAPI /top-headlines categories
NEWSAPI_CATEGORIES = {"business", "entertainment", "general", "health", "science", "sports", "technology"}

def search_news_for_topic(topic: str, page: int = 1, page_size: int = 5):
    """
    Fetch articles for a specific topic accurately:
    - NewsAPI native categories use /top-headlines?category= (most accurate)
    - All other topics use /everything?qInTitle= (title-only match prevents off-topic results)
    """
    try:
        if topic.lower() in NEWSAPI_CATEGORIES:
            url = f"{NEWS_API_BASE_URL}/top-headlines"
            params = {
                "apiKey": NEWS_API_KEY,
                "category": topic.lower(),
                "language": "en",
                "page": page,
                "pageSize": page_size,
            }
        else:
            url = f"{NEWS_API_BASE_URL}/everything"
            from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            params = {
                "apiKey": NEWS_API_KEY,
                "qInTitle": topic,
                "from": from_date,
                "sortBy": "publishedAt",
                "language": "en",
                "page": page,
                "pageSize": page_size,
            }

        response = requests.get(url, params=params)
        if response.status_code != 200:
            return []
        data = response.json()
        return data.get("articles", []) if data.get("status") == "ok" else []
    except Exception as e:
        print(f"Error fetching topic '{topic}': {e}")
        return []

def search_news(query, from_date=None, sort_by="publishedAt", page=1, page_size=20):
    """
    Search for news articles by keyword

    sort_by options: relevancy, popularity, publishedAt
    """
    try:
        url = f"{NEWS_API_BASE_URL}/everything"
        
        # If no from_date provided, get news from last 7 days
        if not from_date:
            from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        params = {
            "apiKey": NEWS_API_KEY,
            "q": query,
            "from": from_date,
            "sortBy": sort_by,
            "page": page,
            "pageSize": page_size,
            "language": "en"
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            print(f"NewsAPI error: {response.status_code}")
            return None
        
        data = response.json()
        
        if data["status"] != "ok":
            print(f"NewsAPI returned error: {data}")
            return None
        
        return data["articles"]
        
    except Exception as e:
        print(f"Error searching news: {e}")
        return None

def format_article(article):
    """
    Format NewsAPI article into our Article model format
    """
    try:
        # NewsAPI sometimes returns articles with removed content
        if article.get("title") == "[Removed]":
            return None
        
        formatted = {
            "article_id": str(hash(article.get("url", ""))),  # Simple ID from URL
            "title": article.get("title", "No title"),
            "source": article.get("source", {}).get("name", "Unknown"),
            "author": article.get("author"),
            "description": article.get("description"),
            "url": article.get("url", ""),
            "image_url": article.get("urlToImage"),
            "published_at": article.get("publishedAt", datetime.now().isoformat()),
            "content": article.get("content"),
            "category": None  # We can add this manually based on the search
        }
        
        return formatted
        
    except Exception as e:
        print(f"Error formatting article: {e}")
        return None

def get_news_by_topics(topics, page=1):
    """
    Get news articles for multiple topics
    Used for user's followed topics
    """
    all_articles = []
    
    for topic in topics:
        articles = search_news(query=topic, page=page, page_size=5)
        
        if articles:
            for article in articles:
                formatted = format_article(article)
                if formatted:
                    formatted["category"] = topic
                    all_articles.append(formatted)
    
    return all_articles