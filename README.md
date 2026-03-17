# AI-ReadSmart Final Year Project (FYP)

Heriot-Watt (Malaysia) H00456192

Welcome to the **AI-ReadSmart** repository. This application is designed to ingest news content, provide AI-powered summaries using Google's Gemini, and offer high-fidelity Speech-To-Text (STT) and Text-To-Speech (TTS) conversational experiences. It uses React Native frontend and Python FastAPI backend backed by MongoDB.

---

## Backend Structure (FastAPI)

The backend is located in the `backend/` folder directory, operating asynchronously as RESTful API.

- **`application/main.py`**: The central entry point and initialization file for the FastAPI application. Registers all API routers, middleware, and startup events.
- **`application/database.py`**: Manages the connection lifecycle with the MongoDB database using `pymongo`.
- **`application/data_models.py`**: Contains Pydantic classes to enforce strict schema validation for all incoming and outgoing API payloads.
- **`application/auth_routes.py` & `application/authentication.py`**: Handles user authentication, token verification via the Firebase Admin SDK, and session security.
- **`application/news_routes.py` & `application/news_service.py`**: Fetches dynamic headlines from the NewsAPI and uses `trafilatura` to scrape and parse full article HTML text.
- **`application/conversation_routes.py` & `application/ai_service.py`**: Interfaces with the Google Gemini Flash API for robust Natural Language Processing, managing the core conversational logic and context summarization.
- **`application/voice_audio_routes.py`**: Connects to Google Cloud Speech-to-Text and Text-to-Speech APIs to handle bidirectional audio transcription and voice synthesis.
- **`application/preferences_routes.py`**: Exposes user-preference management (e.g., preferred news topics, selected TTS voice options).
- **`requirements.txt`**: Records the exact Python dependencies and configurations required to run the local development server.

---

## Frontend Structure (React Native & Expo)

The frontend is located in the `frontend/` folder directory, designed for cross-platform (iOS/Android) mobile capabilities.

- **`src/navigation/AuthNav.js`**: Replaces the default React Navigation behavior with event emitters to broadcast screen transitions. Routes users between the unauthenticated flow and main screens.
- **`src/backend_services/ folder`**: The communication layer. Houses Axios-based wrapper files (`api.js`, `authservice.js`, and etc...) utilized to interface efficiently with the backend REST endpoints.
- **`src/screens/authentication/ folder`**: The unauthenticated app cluster. Includes flows to sign up and log in (`SignupScreen.js`, `LoginScreen.js`), initial topic discovery (`TopicSelectionScreen.js`), and profile configuration (`FillProfileScreen.js`).
- **`src/screens/main/ folder`**: The core operational interface.
  - `HomeScreen.js`: The central personalized feed.
  - `ExploreScreen.js`: Interface to discover new topic categories.
  - `ArticleDetailScreen.js`: Detailed reading and AI-summary view of a specific article.
  - `ConversationHistoryScreen.js` & `ConversationDetailScreen.js`: The chatbot history interface for saved conversation and to use "Smart Recap" feature.
- **`src/screens/settings/ folder`**: Controls for profile fine-tuning (`ProfileScreen.js`, `AccountDetailsScreen.js`) and application tuning (`AudioControlScreen.js`).
- **`src/utils/constants.js`**: Contains fundamental configuration data like application-wide colors, category constants, and the crucial `API_BASE_URL` mapped to the developer's WIFI IPv4 address.
- **`src/components/BottomNavBar.js`**: A globally used standalone UI capability representing the main bottom navigator mapping tab routes.
- **`package.json`**: Records essential Expo and React Native libraries, alongside tools like `@react-navigation`, `expo-av`, and `axios`.

---

## Set-Up Work Flow

Because development spans a Windows host and a WSL (Windows Subsystem for Linux) instance, bridge port-forwarding is frequently required to pass requests from a physical phone testing device through the host into the virtual machine.

### One-Time Setup (First Run Only)

1. **Prepare Python Environment (WSL Terminal):**

   ```
   cd ~/AI-ReadSmart-FYP-/backend
   python3 -m venv venv          
   source venv/bin/activate     
   pip install -r requirements.txt  
   ```

2. **Install Node Modules (Windows or WSL Terminal):**

   ```
   cd ~/AI-ReadSmart-FYP-/frontend
   npm install
   ```

### Daily Startup Routine (Every Time)

#### Step 1: Start Backend & Port Forwarding (WSL / Windows PowerShell)

1. Open **Windows PowerShell as Administrator** and execute:

   ```
  $wsl_ip = (wsl hostname -I).Trim().Split(' ')[0]
  >> netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0
  >> netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=$wsl_ip
  >> Write-Host "Bridge successfully connected to WSL IP: $wsl_ip" -ForegroundColor Green
   ```

2. Launch the Backend Server back in your **WSL Terminal**:

   ```
   cd ~/AI-ReadSmart-FYP-/backend
   source venv/bin/activate
   uvicorn application.main:app --host 0.0.0.0 --port 8000 --reload
   ```

#### Step 2: Verify Network Routing

- **Important Configuration**: Open `frontend/src/utils/constants.js` and modify `API_BASE_URL` to your **Windows Host IPv4 Address** followed by `:8000`.
- **Window Mode**: Press Win + R, type 'cmd', hit confirm, type 'ipconfig', find "Wireless LAN adapter Wi-Fi" and copy the IPv4 Address.
- Verify the API is successfully bridging from external clients by hitting the host IP address on your phone's browser (e.g., `http://192.168.1.3:8000`). It should return application status JSON.

#### Step 3: Start Frontend (Expo)

Ensure you keep the backend terminal open, then in a **New Terminal** navigate to the frontend folder:

```
cd ~/AI-ReadSmart-FYP-/frontend
npm start -- --tunnel --clear
```

*(Use the Expo Go app on your physical mobile testing device to scan the generated QR code and test the full application)*
