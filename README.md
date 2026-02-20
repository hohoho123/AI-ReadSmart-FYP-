# AI-ReadSmart-FYP-
Heriot-Watt (Malaysia) H00456192 FYP

## Backend 
### First Time Setup (Once Only):
python3 -m venv venv          
source venv/bin/activate     
pip install -r requirements.txt  

### Every Time After (Just Activate VE):
source venv/bin/activate    

### Run the Server (FastAPI)
uvicorn application.main:app --reload 
- **Interactive API Docs**: http://127.0.0.1:8000/docs
## Notice `--host 0.0.0.0` - this makes backend accessible from your phone!
uvicorn application.main:app --host 0.0.0.0 --port 8000 --reload

## Save package installation
pip freeze > requirements.txt

## Frontend
npm start -- --tunnel

## ONE-TIME SETUP (Already Done)

This was already completed. Only redo if your computer restarts and connection stops working.

### 1. Check WSL IP Address

**In WSL terminal:**
bash
hostname -I
Example output: `172.28.160.1`

### 2. Set Up Port Forwarding (Windows PowerShell as Admin)

**Open PowerShell as Administrator:**
- Press Windows key
- Type "PowerShell"
- Right-click "Windows PowerShell"
- Click "Run as administrator"

**Run these commands** (replace `172.28.160.1` with your actual WSL IP):
powershell
# Add port forwarding rule
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.28.160.1

# Allow through firewall
netsh advfirewall firewall add rule name="WSL FastAPI" dir=in action=allow protocol=TCP localport=8000

## DAILY WORKFLOW

Every time you want to test on your iPhone:

### Step 1: Start Backend (WSL Terminal)
bash
cd ~/AI-ReadSmart-FYP-/backend
source venv/bin/activate
uvicorn application.main:app --host 0.0.0.0 --port 8000 --reload

**Wait for:**
Server is ready!
INFO:     Uvicorn running on http://0.0.0.0:8000

**Keep this terminal open!**

### Step 2: Verify Backend is Accessible

**On Windows laptop browser, test:**
- `http://localhost:8000` - Should show JSON
- `http://192.168.1.4:8000` - Should show JSON

**On iPhone Safari, test:**
- `http://192.168.1.4:8000` - Should show JSON

**Expected response:**
json
{
  "app": "AI-ReadSmart API",
  "status": "running",
  "version": "1.0.0"
}

### Step 3: Start Frontend (New Terminal - Can be WSL or Windows)

**Option A: WSL with Tunnel (Recommended)**
bash
cd ~/AI-ReadSmart-FYP-/frontend
npm start -- --tunnel
