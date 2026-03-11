import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# MODEL INITIALISATION
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

_model = None


def load_ai_model():
    """
    Initialises and returns the Gemini model instance.
    """
    global _model

    if _model is None:
        print("Loading Gemini AI model...")
        _model = genai.GenerativeModel('models/gemini-2.5-flash')
        print("Gemini 2.5 Flash model loaded successfully.")

    return _model


# =========================================================
# PROMPT LOADERS
# =========================================================

def _load_prompt(filename: str) -> str:
    """
    Loads a system prompt from the /prompts directory by filename.
    Returns a minimal fallback string if the file cannot be read.
    """
    prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', filename)
    try:
        with open(prompt_path, 'r') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading prompt '{filename}': {e}")
        return "You are a helpful assistant."


# =========================================================
# AI CONVERSATION
# =========================================================

def chat_with_ai(user_message: str, article_text, conversation_history=None) -> str | None:
    """
    Sends a message to Gemini and returns the text response.

    Parameters
    ----------
    user_message      : The user's latest question or follow-up.
    article_text      : The scraped article text to ground the response in.
                        Pass None for follow-up turns where the article was already
                        discussed and only conversation history is needed.
    conversation_history : List of prior message dicts with 'role' and 'content' keys.

    Returns
    -------
    The AI response string, or None on error.
    """
    try:
        model = load_ai_model()
        system_prompt = _load_prompt('articles_summarizer.md')

        # Build the conversation history block
        history_text = ""
        if conversation_history:
            history_text = "\n\nPREVIOUS CONVERSATION:\n"
            for msg in conversation_history:
                role = "User" if msg.get("role") == "user" else "Assistant"
                history_text += f"{role}: {msg.get('content')}\n"

        # First turn — article is available, ground the response in it
        if article_text is not None:
            full_prompt = f"""{system_prompt}

ARTICLE CONTENT:
{article_text}
{history_text}

USER MESSAGE:
{user_message}

Respond to the user's message based on the article and conversation history above."""

        # Follow-up turn — rely solely on conversation history for context
        else:
            full_prompt = f"""{system_prompt}
{history_text}

USER MESSAGE:
{user_message}

Continue the conversation naturally. Use the conversation history as your context — the original article was already discussed in the messages above."""

        response = model.generate_content(full_prompt)
        return response.text

    except Exception as e:
        print(f"Gemini API error in chat_with_ai: {e}")
        return None


# =========================================================
# ARTICLE SUMMARISATION
# =========================================================

def summarize_article(article_text: str) -> str | None:
    """
    Generates factual summary of an article.
    Used by the quick-summarise endpoint in main.py.

    Returns the summary string, or None on error.
    """
    try:
        model = load_ai_model()

        prompt = f"""Summarize this news article in 2-3 clear sentences. Focus on the main facts.

Article:
{article_text}

Summary:"""

        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        print(f"Gemini API error in summarize_article: {e}")
        return None


# =========================================================
# SMART RECAP COMPARISON
# =========================================================

def compare_for_smart_recap(
    old_conversation: list,
    new_article_text: str,
    original_article_text=None
) -> str | None:
    """
    Compares the user's original article against a freshly fetched article on the
    same topic and generates a spoken Smart Recap update.

    Parameters
    ----------
    old_conversation      : Full conversation history for the original article.
    new_article_text      : Scraped text from the latest article on the same topic.
    original_article_text : Re-scraped text of the original article (preferred).
                            Falls back to the first assistant message in history
                            when not available.

    Returns
    -------
    The Smart Recap response string, or None on error.
    """
    try:
        model = load_ai_model()

        if not new_article_text:
            return None

        system_prompt = _load_prompt('smart_recap.md')

        # Prefer article-vs-article comparison; fall back to conversation-vs-article
        if original_article_text:
            context_label = "ORIGINAL ARTICLE"
            context_content = original_article_text
        else:
            context_label = "ORIGINAL CONVERSATION SUMMARY"
            context_content = ""
            for msg in old_conversation:
                if msg.get("role") == "assistant":
                    context_content = msg.get("content", "")
                    break

        prompt = f"""{system_prompt}

---

{context_label}:
{context_content}

LATEST ARTICLE:
{new_article_text}"""

        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        print(f"Gemini API error in compare_for_smart_recap: {e}")
        return None
