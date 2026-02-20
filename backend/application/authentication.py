import firebase_admin
from firebase_admin import credentials, auth
import os

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
        decoded = auth.verify_id_token(token)
        return decoded  # Contains user_id, email, etc.
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

# Helper function to get user by email
def get_user_by_email(email):
    """Find user in Firebase by email"""
    try:
        user = auth.get_user_by_email(email)
        return user
    except:
        return None

# Helper function to create new user
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

# Helper function to delete user
def delete_firebase_user(uid):
    """Delete user from Firebase"""
    try:
        auth.delete_user(uid)
        return True
    except:
        return False