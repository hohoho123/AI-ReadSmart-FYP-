# AI-ReadSmart-FYP-
Heriot-Watt (Malaysia) H00456192 FYP

## Backend 
# First Time Setup (Once Only):
python3 -m venv venv          
source venv/bin/activate     
pip install -r requirements.txt  

# Every Time After (Just Activate VE):
source venv/bin/activate    

# Run the Server (FastAPI)
uvicorn application.main:app --reload 
- **Interactive API Docs**: http://127.0.0.1:8000/docs