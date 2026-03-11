import firebase_admin
from firebase_admin import credentials, auth
import os
from fastapi import Request, HTTPException

# Load Firebase credentials
cred_path = os.path.join(os.path.dirname(__file__), '..', 'firebase-backend-credentials.json')

# Check if file exists
if not os.path.exists(cred_path):
    print("ERROR: firebase-backend-credentials.json not found!")
    print(f"Looking for it at: {cred_path}")
else:
    # Initialize Firebase
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    print("Firebase initialized successfully!")

# Helper function to verify user token
def verify_token(token):
    """
    Check if user's token is valid
    Returns user info if valid, None if not
    """
    try:
        decoded = auth.verify_id_token(token, clock_skew_seconds=10)
        return decoded  # Contains user_id, email, etc.
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None
    
    # --- NEW FASTAPI DEPENDENCY (For your protected routes like /news/feed) ---
async def get_current_user(request: Request):
    """
    Extracts token from Authorization header and verifies it.
    Use this as a Depends() in your FastAPI routes.
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
        
    token_string = auth_header.split('Bearer ')[1]
    
    decoded = verify_token(token_string)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    return decoded

# =========================================================
# HELPER FUNCTIONS
# =========================================================
def get_user_by_email(email):
    """Find user in Firebase by email"""
    try:
        user = auth.get_user_by_email(email)
        return user
    except:
        return None

def create_firebase_user(email, password, display_name):
    """
    Create new user in Firebase
    Returns user object if successful
    """
    try:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )
        return user
    except Exception as e:
        print(f"Error creating user: {e}")
        return None

def delete_firebase_user(uid):
    """Delete user from Firebase"""
    try:
        auth.delete_user(uid)
        return True
    except:
        return False