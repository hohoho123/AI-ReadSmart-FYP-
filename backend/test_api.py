"""
AI-ReadSmart Backend API Test Script
Run: python test_api.py
"""

import requests
import json

# ===========================
# CONFIGURATION
# ===========================
BASE_URL = "http://localhost:8000"

# Firebase credentials for testing
FIREBASE_API_KEY = "AIzaSyDdcLK0xmAZ3Vi8hPj5beAA16zgcV33kqM"
TEST_EMAIL = "boaboa@gmail.com"
TEST_PASSWORD = "boaboa123"

# ===========================
# HELPER FUNCTIONS
# ===========================

def get_firebase_token(email, password):
    """Get Firebase ID token for authentication"""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    
    response = requests.post(url, json={
        "email": email,
        "password": password,
        "returnSecureToken": True
    })
    
    if response.status_code == 200:
        token = response.json()["idToken"]
        print(f"✅ Got Firebase token (length: {len(token)})")
        return token
    else:
        print(f"❌ Failed to get token: {response.json()}")
        return None

def make_request(method, endpoint, token=None, data=None, params=None):
    """Make API request with optional auth"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    if method == "GET":
        response = requests.get(url, headers=headers, params=params)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data, params=params)
    elif method == "PUT":
        response = requests.put(url, headers=headers, json=data)
    elif method == "DELETE":
        response = requests.delete(url, headers=headers)
    
    return response

def print_response(name, response):
    """Pretty print API response"""
    print(f"\n{'='*50}")
    print(f"📌 {name}")
    print(f"Status: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)

# ===========================
# TEST FUNCTIONS
# ===========================

def test_health():
    """Test server health"""
    print("\n🏥 TESTING HEALTH ENDPOINTS")
    
    r = make_request("GET", "/")
    print_response("Root Endpoint", r)
    
    r = make_request("GET", "/health")
    print_response("Health Check", r)

def test_auth(token):
    """Test auth endpoints"""
    print("\n🔐 TESTING AUTH ENDPOINTS")
    
    r = make_request("GET", "/auth/verify", token=token)
    print_response("Verify Token", r)
    
    r = make_request("GET", "/auth/me", token=token)
    print_response("Get Current User", r)

def test_preferences(token):
    """Test preferences endpoints"""
    print("\n⚙️ TESTING PREFERENCES ENDPOINTS")
    
    # Get current preferences
    r = make_request("GET", "/preferences/", token=token)
    print_response("Get Preferences", r)
    
    # Follow a topic
    r = make_request("POST", "/preferences/follow-topic", token=token, params={"topic": "health"})
    print_response("Follow Topic (health)", r)
    
    # Unfollow a topic
    r = make_request("POST", "/preferences/unfollow-topic", token=token, params={"topic": "health"})
    print_response("Unfollow Topic (health)", r)
    
    # Update preferences
    r = make_request("PUT", "/preferences/update", token=token, data={
        "tts_voice": "voice_b",
        "playback_speed": "1.25x",
        "tts_enabled": True,
        "stt_enabled": True
    })
    print_response("Update Preferences", r)

def test_news(token):
    """Test news endpoints"""
    print("\n📰 TESTING NEWS ENDPOINTS")
    
    r = make_request("GET", "/news/headlines", params={"category": "technology", "page_size": 3})
    print_response("Get Headlines", r)
    
    r = make_request("GET", "/news/feed", token=token)
    print_response("Get Personalized Feed", r)

def test_ai():
    """Test AI endpoint"""
    print("\n🤖 TESTING AI ENDPOINTS")
    
    # Test AI summarization - requires 'text' parameter
    test_text = "Apple today unveiled its next-generation A20 chip, designed specifically for on-device AI processing. The chip promises 40% faster machine learning tasks while consuming less battery. CEO Tim Cook said this represents the biggest leap in iPhone processing power in five years."
    
    r = make_request("POST", "/test-ai", params={"text": test_text})
    print_response("Test AI Service", r)

def test_conversation(token):
    """Test conversation endpoints"""
    print("\n💬 TESTING CONVERSATION ENDPOINTS")
    
    # Chat with AI
    chat_data = {
        "article_id": "test_001",
        "article_title": "Apple announces new AI chip",
        "article_content": "Apple unveiled the A20 chip for on-device AI. 40% faster ML tasks. Prices start at $999.",
        "message": "What makes this chip special?",
        "conversation_history": []
    }
    r = make_request("POST", "/conversation/chat", token=token, data=chat_data)
    print_response("Chat with AI", r)
    
    # Save conversation
    save_data = {
        "article_id": "test_001",
        "article_title": "Apple announces new AI chip",
        "article_url": "https://example.com/apple-chip",
        "messages": [
            {"role": "user", "content": "What makes this chip special?"},
            {"role": "assistant", "content": "The A20 chip is designed for on-device AI..."}
        ]
    }
    r = make_request("POST", "/conversation/save", token=token, data=save_data)
    print_response("Save Conversation", r)
    
    conv_id = r.json().get("conversation_id") if r.status_code == 200 else None
    
    # Get saved conversations
    r = make_request("GET", "/conversation/saved", token=token)
    print_response("Get Saved Conversations", r)
    
    if conv_id:
        # Smart Recap
        r = make_request("POST", f"/conversation/{conv_id}/followup", token=token, data={
            "message": "What's new?",
            "new_article_text": "UPDATE: A20 chip now shipping."
        })
        print_response("Smart Recap", r)
        
        # Delete
        r = make_request("DELETE", f"/conversation/{conv_id}", token=token)
        print_response("Delete Conversation", r)

def test_voice(token):
    """Test voice endpoints"""
    print("\n🔊 TESTING VOICE ENDPOINTS")
    
    r = make_request("GET", "/voice/test-tts")
    print_response("Test TTS", r)
    
    r = make_request("GET", "/voice/voices", token=token)
    print_response("Get Voices", r)

# ===========================
# MAIN
# ===========================

def main():
    print("🚀 AI-ReadSmart Backend API Test")
    print("=" * 50)
    
    token = get_firebase_token(TEST_EMAIL, TEST_PASSWORD)
    
    if not token:
        print("❌ Cannot continue without token")
        return
    
    test_health()
    test_auth(token)
    test_preferences(token)
    test_news(token)
    test_ai()
    test_conversation(token)
    test_voice(token)
    
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    main()