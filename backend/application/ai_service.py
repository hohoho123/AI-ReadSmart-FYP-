import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Create model instance
model = None

def load_ai_model():
    """
    Initialize Gemini model on startup
    """
    global model
    
    if model is None:
        print("Loading Gemini AI model...")
        
        # Using Gemini 2.5 Flash 
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        print("Gemini 2.5 Flash model loaded successfully!")
    
    return model

def load_system_prompt():
    """
    Load system prompt from markdown file
    You can create this file later with your instructions
    """
    prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'summarizer.md')
    
    # Default prompt if file doesn't exist
    default_prompt = """You are an intelligent news summarizer for AI-ReadSmart, a voice-first news application.

Your role:
- Provide concise, clear summaries of news articles
- Answer user questions based ONLY on the article content
- Use simple, accessible language
- Be conversational and helpful
- If information is not in the article, say "I don't have that information in this article"

Keep responses brief and focused."""
    
    try:
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r') as f:
                return f.read()
        else:
            return default_prompt
    except Exception as e:
        print(f"Error loading prompt: {e}")
        return default_prompt

def chat_with_ai(user_message, article_text, conversation_history=None):
    """
    Main function for AI conversation
    
    Args:
        user_message: User's question or request
        article_text: The article content
        conversation_history: Previous messages (optional)
    
    Returns:
        AI response string
    """
    try:
        ai_model = load_ai_model()
        system_prompt = load_system_prompt()
        
        # Build the full prompt
        full_prompt = f"""{system_prompt}

ARTICLE CONTENT:
{article_text}

USER MESSAGE:
{user_message}

Respond to the user's message based on the article above."""
        
        # If there's conversation history, include it
        if conversation_history and len(conversation_history) > 0:
            history_text = "\n\nPREVIOUS CONVERSATION:\n"
            for msg in conversation_history:
                role = "User" if msg.get("role") == "user" else "Assistant"
                history_text += f"{role}: {msg.get('content')}\n"
            
            full_prompt = f"""{system_prompt}

ARTICLE CONTENT:
{article_text}
{history_text}

USER MESSAGE:
{user_message}

Respond to the user's message based on the article and conversation history above."""
        
        # Generate response
        response = ai_model.generate_content(full_prompt)
        
        return response.text
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None

def summarize_article(article_text):
    """
    Generate a summary of an article
    """
    try:
        ai_model = load_ai_model()
        
        prompt = f"""Summarize this news article in 2-3 clear sentences. Focus on the main facts.

Article:
{article_text}

Summary:"""
        
        response = ai_model.generate_content(prompt)
        return response.text
        
    except Exception as e:
        print(f"Summarization error: {e}")
        return None

def compare_for_smart_recap(old_conversation, new_article_text):
    """
    Compare old conversation with current news for Smart Recap
    
    Args:
        old_conversation: Previous conversation messages
        new_article_text: Current article about same topic (can be None)
    
    Returns:
        Comparison highlighting what changed
    """
    try:
        ai_model = load_ai_model()
        
        # Extract original messages from old conversation
        original_content = ""
        for msg in old_conversation:
            if msg.get("role") == "assistant":
                original_content = msg.get("content", "")
                break
        
        # If no new article, return a note about no updates
        if not new_article_text:
            return f"Based on your previous conversation, here's what I found: {original_content[:200]}... No new articles available to compare."
        
        prompt = f"""You are comparing an old conversation with current news.

ORIGINAL CONVERSATION SUMMARY:
{original_content}

CURRENT ARTICLE:
{new_article_text}

Task: Explain what's new or what has changed since the original conversation. Be specific about:
- New developments
- Price/number changes
- Status updates
- What stayed the same (if relevant)

Keep it concise (3-4 sentences)."""
        
        response = ai_model.generate_content(prompt)
        return response.text
        
    except Exception as e:
        print(f"Smart Recap comparison error: {e}")
        return None